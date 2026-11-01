import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "deeno_admin";
export const SESSION_TTL_S = 60 * 60 * 8; // 8 Stunden

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

export function createSessionToken(username: string, now = Date.now()) {
  const payload = b64(JSON.stringify({ u: username, exp: Math.floor(now / 1000) + SESSION_TTL_S }));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): { username: string } | null {
  if (!token || !isAdminConfigured()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u?: string; exp?: number };
    if (!data.u || !data.exp || data.exp * 1000 < now) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}

