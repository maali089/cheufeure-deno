import { scryptSync, timingSafeEqual } from "node:crypto";

/** Prüft ein Passwort gegen einen Hash im Format scrypt:N:r:p:salt:hash */
export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const [algo, n, r, p, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const N = Number(n), R = Number(r), P = Number(p);
  // Plausible Parameter erzwingen (Schutz vor fehlerhaft konfigurierten Hashes)
  if (!Number.isInteger(N) || N < 16384 || N > 2 ** 20 || R < 1 || R > 32 || P < 1 || P > 4 || 128 * N * R > 200 * 1024 * 1024 || expected.length < 32) return false;
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), expected.length, { N, r: R, p: P, maxmem: 256 * 1024 * 1024 });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

