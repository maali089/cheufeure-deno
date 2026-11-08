import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * TOTP nach RFC 6238 (SHA-1, 6 Ziffern, 30 s) – kompatibel mit Google Authenticator,
 * Microsoft Authenticator, 1Password, Bitwarden u. a.
 */
export const TOTP_PERIOD_S = 30;
const DIGITS = 6;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error("Ungültiges Base32-Zeichen im TOTP-Schlüssel.");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function totpCode(secret: Buffer, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", secret).update(counter).digest();
  const offset = mac[mac.length - 1]! & 0x0f;
  const bin = ((mac[offset]! & 0x7f) << 24) | (mac[offset + 1]! << 16) | (mac[offset + 2]! << 8) | mac[offset + 3]!;
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / TOTP_PERIOD_S);

/**
 * Prüft einen Code (±1 Zeitschritt Toleranz für Uhrabweichungen).
 * Gibt den passenden Zeitschritt zurück (für den Wiederverwendungsschutz) oder null.
 */
export function verifyTotp(secretBase32: string, code: string, now = Date.now()): number | null {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return null;
  let secret: Buffer;
  try {
    secret = base32Decode(secretBase32);
  } catch {
    return null;
  }
  if (secret.length < 10) return null;
  const step = currentStep(now);
  let match: number | null = null;
  for (const s of [step - 1, step, step + 1]) {
    const expected = Buffer.from(totpCode(secret, s));
    // Alle Kandidaten prüfen (konstante Laufzeit)
    if (timingSafeEqual(expected, Buffer.from(normalized)) && match === null) match = s;
  }
  return match;
}
