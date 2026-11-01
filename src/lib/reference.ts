import { randomInt } from "node:crypto";

// Ohne leicht verwechselbare Zeichen (0/O, 1/I/L)
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Erzeugt eine eindeutige, nicht erratbare Anfragenummer, z. B. "DN-261103-7KQ9XM". */
export function createBookingReference(now: Date = new Date()): string {
  const y = String(now.getUTCFullYear()).slice(2);
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `DN-${y}${m}${d}-${suffix}`;
}

export const bookingReferencePattern = /^DN-\d{6}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
