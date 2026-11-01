import { scryptSync, timingSafeEqual } from "node:crypto";

/** Prüft ein Passwort gegen einen Hash im Format scrypt:N:r:p:salt:hash */
export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const [algo, n, r, p, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

