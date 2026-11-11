import { expect, test } from "@playwright/test";
import { futureDate, randomIp } from "./helpers";

const valid = () => ({
  tripType: "ONE_WAY",
  pickupAddress: "Marienplatz 1, München",
  dropoffAddress: "Hauptbahnhof München",
  stops: [],
  pickupDate: futureDate(10),
  pickupTime: "12:00",
  passengers: 1,
  luggage: 0,
  vehicleClass: "business",
  firstName: "API",
  lastName: "Test",
  email: `api+${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
  phone: "+49 170 0000000",
  privacy: true,
  website: "",
  startedAt: Date.now() - 30000,
});

test.describe("Serverseitige Validierung & Sicherheit", () => {
  test("ungültige Daten → 422 mit Feldfehlern", async ({ request }) => {
    const res = await request.post("/api/booking", { data: { ...valid(), email: "x", passengers: 99, pickupDate: "2020-01-01" }, headers: { "x-forwarded-for": randomIp() } });
    expect(res.status()).toBe(422);
    const json = await res.json();
    expect(Object.keys(json.fieldErrors)).toEqual(expect.arrayContaining(["email", "passengers"]));
  });

  test("manipulierte Fahrzeugklasse → 422", async ({ request }) => {
    const res = await request.post("/api/booking", { data: { ...valid(), vehicleClass: "maybach" }, headers: { "x-forwarded-for": randomIp() } });
    expect(res.status()).toBe(422);
  });

  test("zu schnell abgeschickt (Bot) → abgelehnt", async ({ request }) => {
    const res = await request.post("/api/booking", { data: { ...valid(), startedAt: Date.now() }, headers: { "x-forwarded-for": randomIp() } });
    expect(res.status()).toBe(400);
  });

  test("Cross-Site-Anfrage → 403", async ({ request }) => {
    const res = await request.post("/api/booking", { data: valid(), headers: { origin: "https://evil.example", "x-forwarded-for": randomIp() } });
    expect(res.status()).toBe(403);
  });

  test("übergroße Anfrage → 400", async ({ request }) => {
    const res = await request.post("/api/booking", { data: { ...valid(), tripNotes: "x".repeat(30000) }, headers: { "x-forwarded-for": randomIp() } });
    expect(res.status()).toBe(400);
  });

  test("Rate-Limit greift", async ({ request }) => {
    const ip = randomIp();
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await request.post("/api/booking", { data: { ...valid(), email: "bad" }, headers: { "x-forwarded-for": ip } });
      statuses.push(r.status());
    }
    expect(statuses.slice(0, 5).every((s) => s === 422)).toBeTruthy();
    expect(statuses.at(-1)).toBe(429);
  });

  test("gültige API-Anfrage wird gespeichert, E-Mail-Status ehrlich", async ({ request }) => {
    const res = await request.post("/api/booking", { data: valid(), headers: { "x-forwarded-for": randomIp() } });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.reference).toMatch(/^DN-\d{6}-[A-Z0-9]{6}$/);
    // Lokal ist kein E-Mail-Dienst konfiguriert → darf nicht "sent" melden
    expect(json.customerMail).toBe("not_sent");
  });

  test("Adress-API ohne Aktivierung deaktiviert", async ({ request }) => {
    const json = await (await request.get("/api/places?q=Marienplatz")).json();
    expect(json.enabled).toBe(false);
  });

  test("Admin-Seiten ohne Anmeldung nicht erreichbar", async ({ request }) => {
    for (const path of ["/admin", "/admin/nachrichten", "/admin/flotte", "/admin/anfragen/abcdefghijklmnop"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([302, 307, 308]).toContain(res.status());
      expect(res.headers()["location"]).toContain("/admin/login");
    }
    const forgedValue = "eyJ1IjoiYWRtaW4iLCJleHAiOjk5OTk5OTk5OTl9.fake";
    const forged = await request.get("/admin", { maxRedirects: 0, headers: { cookie: `deeno_admin=${forgedValue}; __Host-deeno_admin=${forgedValue}` } });
    expect([302, 307, 308]).toContain(forged.status());
  });
});
