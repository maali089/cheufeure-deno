// Erzeugt einen scrypt-Hash für ADMIN_PASSWORD_HASH.
//   npm run admin:hash -- "IhrSicheresPasswort"
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Bitte ein Passwort mit mindestens 12 Zeichen angeben: npm run admin:hash -- \"…\"");
  process.exit(1);
}
// OWASP-Empfehlung für scrypt: N=2^17, r=8, p=1 (ca. 128 MiB Speicher pro Prüfung)
const N = 131072, r = 8, p = 1;
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N, r, p, maxmem: 256 * 1024 * 1024 });
console.log(`scrypt:${N}:${r}:${p}:${salt.toString("base64url")}:${hash.toString("base64url")}`);
