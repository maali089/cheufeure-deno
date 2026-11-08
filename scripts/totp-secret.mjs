// Erzeugt einen neuen TOTP-Schlüssel (2FA) für den Adminbereich.
//   npm run admin:totp
// Ausgabe: Wert für ADMIN_TOTP_SECRET und eine otpauth://-Adresse für die Authenticator-App.
import { randomBytes } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const buf = randomBytes(20);
let bits = 0, value = 0, secret = "";
for (const byte of buf) {
  value = (value << 8) | byte;
  bits += 8;
  while (bits >= 5) {
    secret += BASE32[(value >>> (bits - 5)) & 31];
    bits -= 5;
  }
}
if (bits > 0) secret += BASE32[(value << (5 - bits)) & 31];

const user = process.argv[2] || process.env.ADMIN_USERNAME || "deeno";
const label = encodeURIComponent(`DEENO Verwaltung:${user}`);
console.log(`ADMIN_TOTP_SECRET=${secret}`);
console.log("");
console.log("In der Authenticator-App manuell eingeben (Schlüssel oben, zeitbasiert, 6 Ziffern)");
console.log("oder diese Adresse als QR-Code öffnen (nicht in fremde Online-Dienste kopieren):");
console.log(`otpauth://totp/${label}?secret=${secret}&issuer=DEENO&algorithm=SHA1&digits=6&period=30`);
