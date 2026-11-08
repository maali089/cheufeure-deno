import { expect, test } from "@playwright/test";
import { CAR, T, WORLD, computeFrame } from "../../src/components/story/engine";
import { berlinNow } from "../../src/lib/datetime";
import { bookingCustomerMail, bookingOperatorMail, escapeHtml } from "../../src/lib/mail/templates";
import { quote } from "../../src/lib/pricing";
import { bookingReferencePattern, createBookingReference } from "../../src/lib/reference";
import { verifyPassword } from "../../src/lib/server/password";
import { createSessionToken, sessionIdHash, verifySessionToken } from "../../src/lib/server/session-token";
import { base32Decode, base32Encode, currentStep, totpCode, verifyTotp } from "../../src/lib/server/totp";
import { bookingSchema, contactSchema, tripStepSchema, vehicleStepSchema } from "../../src/lib/validation";
import { whatsappHref, whatsappTripMessage } from "../../src/lib/whatsapp";

function futureDate(days: number) {
  return berlinNow(new Date(Date.now() + days * 86400000)).date;
}

const validTrip = {
  tripType: "ONE_WAY",
  pickupAddress: "Marienplatz 1, München",
  dropoffAddress: "Flughafen München",
  stops: [],
  pickupDate: futureDate(3),
  pickupTime: "10:30",
  passengers: 2,
  luggage: 2,
};
const validBooking = {
  ...validTrip,
  vehicleClass: "first",
  firstName: "Max",
  lastName: "Muster",
  email: "max@example.com",
  phone: "+49 170 1234567",
  privacy: true,
  startedAt: Date.now() - 60000,
};

test.describe("Validierung Buchung", () => {
  test("gültige Anfrage wird akzeptiert", () => {
    expect(bookingSchema.safeParse(validBooking).success).toBe(true);
  });
  test("Pflichtfelder werden geprüft", () => {
    const r = bookingSchema.safeParse({ ...validBooking, pickupAddress: "", email: "kein-mail", privacy: false });
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["pickupAddress", "email", "privacy"]));
  });
  test("Datum in der Vergangenheit wird abgelehnt", () => {
    expect(tripStepSchema.safeParse({ ...validTrip, pickupDate: "2020-01-01" }).success).toBe(false);
  });
  test("ungültiges Datum (30. Februar) wird abgelehnt", () => {
    const y = new Date().getFullYear() + 1;
    expect(tripStepSchema.safeParse({ ...validTrip, pickupDate: `${y}-02-30` }).success).toBe(false);
  });
  test("Zieladresse bei Einzelfahrt Pflicht, bei Stundenbuchung optional", () => {
    expect(tripStepSchema.safeParse({ ...validTrip, dropoffAddress: "" }).success).toBe(false);
    expect(tripStepSchema.safeParse({ ...validTrip, tripType: "HOURLY", dropoffAddress: "", durationHours: 4 }).success).toBe(true);
    expect(tripStepSchema.safeParse({ ...validTrip, tripType: "HOURLY", dropoffAddress: "" }).success).toBe(false);
  });
  test("Rückfahrt muss nach der Hinfahrt liegen", () => {
    const base = { ...validTrip, tripType: "ROUND_TRIP" };
    expect(tripStepSchema.safeParse(base).success).toBe(false);
    expect(tripStepSchema.safeParse({ ...base, returnDate: validTrip.pickupDate, returnTime: "09:00" }).success).toBe(false);
    expect(tripStepSchema.safeParse({ ...base, returnDate: futureDate(4), returnTime: "09:00" }).success).toBe(true);
  });
  test("Flugnummer-Format", () => {
    expect(tripStepSchema.safeParse({ ...validTrip, flightNumber: "LH 2034" }).success).toBe(true);
    expect(tripStepSchema.safeParse({ ...validTrip, flightNumber: "<script>" }).success).toBe(false);
  });
  test("Fahrzeugkapazität wird geprüft", () => {
    expect(vehicleStepSchema.safeParse({ vehicleClass: "business", passengers: 5, luggage: 1 }).success).toBe(false);
    expect(vehicleStepSchema.safeParse({ vehicleClass: "van", passengers: 5, luggage: 1 }).success).toBe(true);
    expect(vehicleStepSchema.safeParse({ vehicleClass: "lkw", passengers: 1, luggage: 1 }).success).toBe(false);
  });
  test("Kontaktformular", () => {
    const ok = { name: "Erika Muster", email: "e@example.com", subject: "Firmenkunden", message: "Bitte um Rückruf wegen Rahmenvertrag.", privacy: true, startedAt: Date.now() };
    expect(contactSchema.safeParse(ok).success).toBe(true);
    expect(contactSchema.safeParse({ ...ok, subject: "Spam" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...ok, message: "kurz" }).success).toBe(false);
  });
});

test.describe("Hilfsfunktionen", () => {
  test("Anfragenummer ist eindeutig und im erwarteten Format", () => {
    const refs = new Set(Array.from({ length: 2000 }, () => createBookingReference()));
    expect(refs.size).toBe(2000);
    for (const r of refs) expect(r).toMatch(bookingReferencePattern);
  });
  test("HTML-Escaping in E-Mails", () => {
    expect(escapeHtml(`<img src=x onerror="a">&'`)).toBe("&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
  });
  test("WhatsApp-Nachricht enthält Fahrtdaten, aber keine Kontaktdaten", () => {
    const msg = whatsappTripMessage({ tripType: "AIRPORT", pickupAddress: "Maisach", dropoffAddress: "Flughafen München", pickupDate: "2030-05-01", pickupTime: "07:00", passengers: 2 });
    expect(msg).toContain("Flughafentransfer");
    expect(msg).not.toMatch(/@|E-Mail|Telefon/);
    expect(whatsappHref()).toMatch(/^https:\/\/wa\.me\/491607703472\?text=Guten%20Tag/);
  });
  test("Preislogik liefert ohne Preisregeln immer 'Individuelles Angebot'", () => {
    expect(quote({ tripType: "ONE_WAY", vehicleClass: "first", stops: 0, isAirport: false, distanceMeters: 30000, durationSeconds: 1800 })).toEqual({ kind: "on_request" });
  });
  test("Admin-Session: Signatur, Ablauf und Manipulation", () => {
    process.env.ADMIN_PASSWORD_HASH = "scrypt:x";
    process.env.ADMIN_SESSION_SECRET = "a".repeat(48);
    const { token, sid } = createSessionToken("deeno");
    expect(verifySessionToken(token)?.username).toBe("deeno");
    expect(verifySessionToken(token)?.sid).toBe(sid);
    const [payload, sig] = token.split(".");
    // manipulierte Rolle/Benutzer mit alter Signatur
    const forged = Buffer.from(JSON.stringify({ u: "admin", sid: "x", exp: 9999999999 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${sig}`)).toBeNull();
    expect(verifySessionToken(`${payload}.x${sig!.slice(1)}`)).toBeNull();
    expect(verifySessionToken(`${payload}.${sig}.extra`)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("a".repeat(5000))).toBeNull();
    // abgelaufen
    expect(verifySessionToken(token, Date.now() + 9 * 3600 * 1000)).toBeNull();
    // anderer Signaturschlüssel → ungültig
    process.env.ADMIN_SESSION_SECRET = "b".repeat(48);
    expect(verifySessionToken(token)).toBeNull();
    process.env.ADMIN_SESSION_SECRET = "a".repeat(48);
    // Passwortwechsel → alle bestehenden Sitzungen ungültig
    process.env.ADMIN_PASSWORD_HASH = "scrypt:y";
    expect(verifySessionToken(token)).toBeNull();
    process.env.ADMIN_PASSWORD_HASH = "scrypt:x";
    expect(verifySessionToken(token)?.username).toBe("deeno");
    // zwei Anmeldungen erhalten unterschiedliche Sitzungs-IDs
    expect(createSessionToken("deeno").sid).not.toBe(sid);
    expect(sessionIdHash(sid)).toMatch(/^[a-f0-9]{64}$/);
  });
  test("TOTP (RFC 6238): Testvektoren, Zeitfenster, Formatprüfung", () => {
    // RFC 6238, Anhang B (SHA-1, Schlüssel "12345678901234567890"), letzte 6 Ziffern
    const key = Buffer.from("12345678901234567890");
    expect(totpCode(key, Math.floor(59 / 30))).toBe("287082");
    expect(totpCode(key, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpCode(key, Math.floor(1234567890 / 30))).toBe("005924");
    const secret = base32Encode(key);
    expect(base32Decode(secret).equals(key)).toBe(true);
    const now = 1234567890 * 1000;
    expect(verifyTotp(secret, "005924", now)).toBe(Math.floor(1234567890 / 30));
    expect(verifyTotp(secret, "005 924", now)).not.toBeNull();
    // ±1 Zeitschritt erlaubt, ±2 nicht
    expect(verifyTotp(secret, "005924", now + 30_000)).not.toBeNull();
    expect(verifyTotp(secret, "005924", now + 90_000)).toBeNull();
    expect(verifyTotp(secret, "000000", now)).toBeNull();
    expect(verifyTotp(secret, "' OR 1=1 --", now)).toBeNull();
    expect(verifyTotp(secret, "", now)).toBeNull();
    expect(verifyTotp("!!!", "005924", now)).toBeNull();
  });
  test("TOTP-Skript erzeugt gültigen Schlüssel", async () => {
    const { execFileSync } = await import("node:child_process");
    const out = execFileSync(process.execPath, ["scripts/totp-secret.mjs"]).toString();
    const secret = /ADMIN_TOTP_SECRET=([A-Z2-7]+)/.exec(out)?.[1];
    expect(secret).toBeTruthy();
    expect(base32Decode(secret!).length).toBe(20);
    const code = totpCode(base32Decode(secret!), currentStep());
    expect(verifyTotp(secret!, code)).toBe(currentStep());
  });
  test("Kunden-E-Mail spiegelt keine Freitexte, HTML wird escaped", () => {
    const data = bookingSchema.parse({ ...validBooking, firstName: "<script>alert(1)</script>", tripNotes: "Klicken Sie hier: https://phishing.example" });
    const cu = bookingCustomerMail(data, "DN-261106-ABCDEF");
    expect(cu.html).not.toContain("phishing.example");
    expect(cu.text).not.toContain("phishing.example");
    expect(cu.html).not.toContain("<script>");
    expect(cu.html).toContain("&lt;script&gt;");
    // Der Betreiber erhält den Freitext weiterhin
    expect(bookingOperatorMail(data, "DN-261106-ABCDEF").text).toContain("phishing.example");
  });
  test("Mass Assignment: interne Felder werden aus Anfragen entfernt", () => {
    const parsed = bookingSchema.parse({ ...validBooking, status: "CONFIRMED", paymentStatus: "PAID", quotedPrice: 1, adminNotes: "x", id: "abc", reference: "DN-000000-AAAAAA" });
    for (const k of ["status", "paymentStatus", "quotedPrice", "adminNotes", "id", "reference"]) expect(k in parsed).toBe(false);
  });
  test("Übergroße und manipulierte Eingaben werden abgelehnt", () => {
    expect(bookingSchema.safeParse({ ...validBooking, firstName: "x".repeat(81) }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validBooking, tripNotes: "x".repeat(1001) }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validBooking, stops: Array.from({ length: 6 }, () => ({ address: "A" })) }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validBooking, passengers: -1 }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validBooking, passengers: "1; DROP TABLE" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validBooking, tripType: "FREE_RIDE" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validBooking, privacy: "true" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validBooking, email: "a@b.de\r\nBcc: x@y.de" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validBooking, phone: "<img src=x onerror=alert(1)>" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validBooking, turnstileToken: "x".repeat(3000) }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Max", email: "max@example.com", subject: "Hack", message: "x".repeat(20), privacy: true, startedAt: 1 }).success).toBe(false);
  });
  test("Passwort-Hash (scrypt) inkl. Parameterprüfung", async () => {
    const { execFileSync } = await import("node:child_process");
    const hash = execFileSync(process.execPath, ["scripts/hash-password.mjs", "ein-sehr-sicheres-passwort"]).toString().trim();
    expect(verifyPassword("ein-sehr-sicheres-passwort", hash)).toBe(true);
    expect(verifyPassword("falsch", hash)).toBe(false);
    expect(verifyPassword("x", undefined)).toBe(false);
    expect(hash.startsWith("scrypt:131072:8:1:")).toBe(true);
    // Unsichere oder manipulierte Parameter werden nicht akzeptiert
    const [, , , , salt, h] = hash.split(":");
    expect(verifyPassword("ein-sehr-sicheres-passwort", `scrypt:2:8:1:${salt}:${h}`)).toBe(false);
    expect(verifyPassword("ein-sehr-sicheres-passwort", `scrypt:1048576:32:1:${salt}:${h}`)).toBe(false);
    expect(verifyPassword("ein-sehr-sicheres-passwort", "md5:abc")).toBe(false);
  });
});

test.describe("Animations-Engine (kompakt)", () => {
  test("deterministisch (gleicher Fortschritt = gleiches Bild, auch rückwärts)", () => {
    for (const p of [0, 0.1, 0.25, 0.5, 0.8, 1]) expect(JSON.stringify(computeFrame(p))).toBe(JSON.stringify(computeFrame(p)));
  });
  test("Fahrzeug hält vor dem Fahrgast", () => {
    expect(computeFrame((T.arrive[1] + T.depart[0]) / 2).car.x).toBe(WORLD.X1);
  });
  test("Raddrehung passt zur zurückgelegten Strecke", () => {
    const a = computeFrame(0.1);
    const b = computeFrame(0.101);
    const dist = a.car.x - b.car.x;
    const expected = ((dist / CAR.wheelR) * 180) / Math.PI;
    const dRot = (((a.car.wheel - b.car.wheel) % 360) + 360) % 360;
    expect(Math.abs(dRot - (expected % 360))).toBeLessThan(1.5);
  });
  test("Tür beim Einstieg geöffnet, danach geschlossen und Fahrgast im Fahrzeug", () => {
    expect(computeFrame(0.5).door.open).toBeGreaterThan(0.9);
    const f = computeFrame(0.75);
    expect(f.door.open).toBe(0);
    expect(f.pax.inside).toBe(1);
  });
  test("Fahrzeug verlässt das Bild nach links, Schlusstext erscheint", () => {
    const f = computeFrame(1);
    expect(f.car.x).toBe(WORLD.X3);
    expect(f.car.x).toBeLessThan(WORLD.X1 - 1500);
    expect(f.finale).toBe(1);
  });
});

test.describe("Preislogik mit (Test-)Regeln", () => {
  const rules = {
    version: "test",
    currency: "EUR" as const,
    airportSurcharge: 10,
    perStop: 5,
    extras: {},
    perVehicle: {
      business: { baseFare: 10, perKm: 1, perMinute: 0, hourlyRate: 50, minimumFare: 30 },
      first: { baseFare: 20, perKm: 2, perMinute: 0, hourlyRate: 80, minimumFare: 50 },
      van: { baseFare: 15, perKm: 1.5, perMinute: 0, hourlyRate: 60, minimumFare: 40 },
    },
  };
  test("ohne echte Strecke kein Festpreis", () => {
    expect(quote({ tripType: "ONE_WAY", vehicleClass: "first", stops: 0, isAirport: false }, rules).kind).toBe("on_request");
  });
  test("mit Strecke serverseitig berechneter Festpreis", () => {
    const q = quote({ tripType: "AIRPORT", vehicleClass: "first", stops: 1, isAirport: true, distanceMeters: 30000, durationSeconds: 1800 }, rules);
    expect(q).toMatchObject({ kind: "fixed", amount: 20 + 60 + 10 + 5 });
  });
  test("Stundenbuchung und Mindestpreis", () => {
    expect(quote({ tripType: "HOURLY", vehicleClass: "business", stops: 0, isAirport: false, durationHours: 3 }, rules)).toMatchObject({ amount: 150 });
    expect(quote({ tripType: "ONE_WAY", vehicleClass: "business", stops: 0, isAirport: false, distanceMeters: 1000, durationSeconds: 60 }, rules)).toMatchObject({ amount: 30 });
  });
});
