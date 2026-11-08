import { config as loadEnv } from "dotenv";
import pg from "pg";

/**
 * Nur lokale Testdatenbank: Rate-Limit-Zähler und verbrauchte 2FA-Codes zurücksetzen,
 * damit wiederholte Testläufe nicht an den (absichtlich strengen) Limits scheitern.
 * Gegen entfernte Datenbanken wird NICHTS ausgeführt.
 */
export default async function globalSetup() {
  loadEnv({ path: ".env.local", quiet: true });
  const url = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return;
  const host = new URL(url).hostname;
  if (!["127.0.0.1", "localhost", "[::1]"].includes(host)) return;
  const client = new pg.Client({ connectionString: url.replace(/\?.*$/, ""), ssl: false });
  try {
    await client.connect();
    await client.query('DELETE FROM "RateLimitBucket"');
    await client.query('DELETE FROM "AdminTotpUse"');
  } catch {
    // Tabelle existiert ggf. noch nicht (Migrationen nicht angewendet) – Tests melden das selbst
  } finally {
    await client.end().catch(() => {});
  }
}
