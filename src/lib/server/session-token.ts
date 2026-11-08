import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Admin-Sitzungstoken: signierte Nutzlast (HMAC-SHA256) mit zufälliger Sitzungs-ID.
 * Die Signatur wird bereits im Proxy geprüft; ob die Sitzung noch gültig (nicht abgemeldet,
 * nicht im Leerlauf abgelaufen) ist, prüft requireAdmin() zusätzlich in der Datenbank.
 */

// Präfix __Host- (nur HTTPS, kein Domain-Attribut, Pfad /) – lokal über http nicht möglich.
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-deeno_admin" : "deeno_admin";
export const SESSION_TTL_S = 60 * 60 * 8; // absolute Höchstdauer: 8 Stunden
export const SESSION_IDLE_S = 60 * 30; // Abmeldung nach 30 Minuten Inaktivität

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD_HASH && (process.env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32);
}

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET ?? "";
  if (s.length < 32) throw new Error("ADMIN_SESSION_SECRET fehlt oder ist zu kurz (min. 32 Zeichen).");
  return s;
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/**
 * Fingerabdruck der Zugangsdaten: Ändert sich Passwort-Hash oder 2FA-Schlüssel,
 * werden alle bestehenden Sitzungen automatisch ungültig.
 */
export function credentialVersion() {
  return createHash("sha256")
    .update(`${process.env.ADMIN_PASSWORD_HASH ?? ""}|${process.env.ADMIN_TOTP_SECRET ?? ""}|${process.env.ADMIN_USERNAME ?? ""}`)
    .digest("base64url")
    .slice(0, 16);
}

/** Hash der Sitzungs-ID, wie er in der Datenbank gespeichert wird. */
export const sessionIdHash = (sid: string) => createHash("sha256").update(sid).digest("hex");

export function createSessionToken(username: string, now = Date.now()) {
  const sid = randomBytes(32).toString("base64url");
  const exp = Math.floor(now / 1000) + SESSION_TTL_S;
  const payload = b64(JSON.stringify({ u: username, sid, exp, cv: credentialVersion() }));
  return { token: `${payload}.${sign(payload)}`, sid, expiresAt: new Date(exp * 1000) };
}

export interface SessionClaims {
  username: string;
  sid: string;
  exp: number;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): SessionClaims | null {
  if (!token || token.length > 1000 || !isAdminConfigured()) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u?: unknown; sid?: unknown; exp?: unknown; cv?: unknown };
    if (typeof data.u !== "string" || typeof data.sid !== "string" || typeof data.exp !== "number") return null;
    if (data.exp * 1000 < now) return null;
    if (data.cv !== credentialVersion()) return null;
    return { username: data.u, sid: data.sid, exp: data.exp };
  } catch {
    return null;
  }
}
