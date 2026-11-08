import "server-only";
import { createHmac } from "node:crypto";
import { db, isDatabaseConfigured } from "./db";
import { logError } from "./log";

export type RateLimitResult = { ok: boolean; retryAfter: number };

/**
 * In-Memory-Rate-Limit (Sliding Window) pro Schlüssel.
 * Gilt nur pro Server-Instanz – wird nur als Rückfallebene genutzt, wenn keine Datenbank
 * erreichbar ist.
 */
const buckets = new Map<string, number[]>();
let lastCleanup = 0;

export function rateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0]!)) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}

/** Schlüssel pseudonymisieren: keine IP-/E-Mail-Adressen im Klartext in der Datenbank. */
function hashKey(key: string) {
  const salt = process.env.RATE_LIMIT_SECRET || process.env.ADMIN_SESSION_SECRET || "deeno-rate-limit";
  return createHmac("sha256", salt).update(key).digest("base64url").slice(0, 43);
}

/**
 * Zentrales Rate-Limit (Fixed Window) in PostgreSQL – wirkt über alle Serverless-Instanzen
 * hinweg. Ein einziges atomares Statement (INSERT … ON CONFLICT), daher ohne Race Conditions.
 * Fällt bei Datenbankfehlern auf das In-Memory-Limit zurück (nie komplett ungeschützt).
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (!isDatabaseConfigured()) return rateLimitMemory(key, limit, windowMs);
  const now = Date.now();
  const cutoff = now - windowMs;
  try {
    const rows = await db().$queryRaw<{ count: number; windowStartMs: bigint }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "windowStartMs")
      VALUES (${hashKey(key)}, 1, ${now}::bigint)
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."windowStartMs" <= ${cutoff}::bigint THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "windowStartMs" = CASE WHEN "RateLimitBucket"."windowStartMs" <= ${cutoff}::bigint THEN ${now}::bigint ELSE "RateLimitBucket"."windowStartMs" END
      RETURNING "count", "windowStartMs"`;
    const row = rows[0];
    if (!row) return rateLimitMemory(key, limit, windowMs);
    // Alte Einträge (älter als 2 Tage) aufräumen – höchstens einmal pro Stunde und Instanz
    if (now - lastCleanup > 3_600_000) {
      lastCleanup = now;
      void db()
        .$executeRaw`DELETE FROM "RateLimitBucket" WHERE "windowStartMs" < ${now - 2 * 86_400_000}::bigint`
        .catch(() => {});
    }
    if (Number(row.count) > limit) {
      const retryAfter = Math.max(1, Math.ceil((Number(row.windowStartMs) + windowMs - now) / 1000));
      return { ok: false, retryAfter };
    }
    return { ok: true, retryAfter: 0 };
  } catch (e) {
    logError("rate-limit", e);
    return rateLimitMemory(key, limit, windowMs);
  }
}
