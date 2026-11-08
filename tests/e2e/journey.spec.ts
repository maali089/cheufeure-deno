import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { adminLogin, futureDate, randomIp } from "./helpers";

/**
 * Kompletter Ablauf wie im Betrieb:
 * Fahrgast stellt Anfrage → Datenbank speichert → Auftragsnummer → Admin sieht Anfrage →
 * WhatsApp-Preisabsprache → Admin trägt Preis ein → Fahrt wird bestätigt.
 * Alle Testdaten sind mit „E2E-Test“ bzw. @example.com gekennzeichnet (lokale Testdatenbank).
 */

test.describe.configure({ mode: "serial" });

const DB_URL = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
const isLocalDb = (() => {
  try {
    return ["127.0.0.1", "localhost"].includes(new URL(DB_URL).hostname);
  } catch {
    return false;
  }
})();
test.skip(!isLocalDb, "nur gegen die lokale Testdatenbank");

async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: DB_URL.replace(/\?.*$/, ""), ssl: false });
  await client.connect();
  try {
    return (await client.query(query, params)).rows as T[];
  } finally {
    await client.end();
  }
}

const run = Date.now();
const mail = (tag: string) => `e2e-${tag}-${run}@example.com`;

interface UiBooking {
  vehicle: RegExp;
  email: string;
  firstName?: string;
  phone?: string;
  pickup?: string;
  dropoff?: string;
  days?: number;
  time?: string;
  extraPassengers?: number;
}

/** Anfrage wie ein Fahrgast über das Formular auf der Startseite stellen. Gibt die Auftragsnummer zurück. */
async function bookAsGuest(page: Page, b: UiBooking) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await page.goto("/#buchen");
  const form = page.locator("#buchen");
  await form.scrollIntoViewIfNeeded();
  // Menschliche Ausfülldauer (der Spam-Schutz lehnt Formulare ab, die in < 4 s abgeschickt werden)
  const started = Date.now();
  // Der Fahrgast kann an keiner Stelle einen Preis eingeben
  await expect(form.locator('input[name*="price" i], input[name*="preis" i], input[id*="price" i]')).toHaveCount(0);
  await form.locator("#pickupAddress").fill(b.pickup ?? "E2E-Test Marienplatz 1, 80331 München");
  await form.locator("#dropoffAddress").fill(b.dropoff ?? "E2E-Test Flughafen München, Terminal 2");
  await form.locator("#pickupDate").fill(futureDate(b.days ?? 12));
  await form.locator("#pickupTime").fill(b.time ?? "08:30");
  for (let i = 0; i < (b.extraPassengers ?? 1); i++) await form.getByRole("button", { name: "Personen erhöhen" }).click();
  await form.getByRole("button", { name: "Weiter", exact: true }).click();
  await form.getByRole("radio", { name: b.vehicle }).click();
  await form.getByRole("button", { name: "Weiter", exact: true }).click();
  await form.locator("#firstName").fill(b.firstName ?? "E2E-Test");
  await form.locator("#lastName").fill("Fahrgast");
  await form.locator("#email").fill(b.email);
  await form.locator("#phone").fill(b.phone ?? "0170 1234567");
  await form.locator('label[for="privacy"]').click();
  await form.getByRole("button", { name: "Weiter", exact: true }).click();
  await expect(form.getByText("Es erfolgt keine Zahlung.", { exact: false })).toBeVisible();
  await page.waitForTimeout(Math.max(0, 4500 - (Date.now() - started)));
  await form.getByRole("button", { name: "Unverbindliches Angebot anfordern" }).click();
  await page.waitForURL(/\/anfrage\/eingegangen/);
  // Keine falsche Bestätigung: die Seite spricht von einer Anfrage, nicht von einer gebuchten Fahrt
  await expect(page.getByText("Wir melden uns zur Bestätigung Ihrer Fahrt.")).toBeVisible();
  return (await page.getByTestId("booking-reference").textContent())!.trim();
}

const row = async (reference: string) =>
  (await sql<Record<string, unknown>>(`SELECT * FROM "BookingRequest" WHERE "reference" = $1`, [reference]))[0]!;

async function openDetail(page: Page, reference: string) {
  await page.goto(`/admin?q=${encodeURIComponent(reference)}`);
  await page.getByRole("link", { name: reference }).first().click();
  await expect(page.getByRole("heading", { name: reference })).toBeVisible();
}

let mainRef = "";

test("1 · Fahrgast: Anfrage S-Klasse → gespeichert, vollständig, mit Auftragsnummer, nicht bestätigt", async ({ page }) => {
  mainRef = await bookAsGuest(page, { vehicle: /Mercedes-Benz S-Klasse/, email: mail("main"), phone: "+49 (0)170 1234567", time: "09:45" });
  expect(mainRef).toMatch(/^DN-\d{6}-[2-9A-HJKMNP-Z]{6}$/);
  const r = await row(mainRef);
  expect(r).toMatchObject({
    status: "RECEIVED",
    tripType: "ONE_WAY",
    pickupAddress: "E2E-Test Marienplatz 1, 80331 München",
    dropoffAddress: "E2E-Test Flughafen München, Terminal 2",
    pickupDate: futureDate(12),
    pickupTime: "09:45",
    passengers: 2,
    vehicleClass: "first",
    firstName: "E2E-Test",
    lastName: "Fahrgast",
    email: mail("main"),
    phone: "+49 (0)170 1234567",
    agreedPrice: null,
    confirmedAt: null,
    paymentStatus: "NOT_REQUIRED",
  });
  const history = await sql(`SELECT "toStatus","changedBy" FROM "BookingStatusChange" WHERE "bookingId" = $1`, [r.id]);
  expect(history).toEqual([{ toStatus: "RECEIVED", changedBy: "website" }]);
});

test("2 · Admin: Anfrage in der Liste mit Telefonnummer, Details und vorbereitetem WhatsApp-Chat", async ({ page, context }) => {
  await adminLogin(page);
  await page.goto(`/admin?q=${encodeURIComponent(mainRef)}`);
  const line = page.locator("tr", { hasText: mainRef });
  await expect(line).toContainText("+49 (0)170 1234567");
  await expect(line).toContainText("Eingegangen");
  await openDetail(page, mainRef);
  await expect(page.getByText("noch nicht vereinbart")).toBeVisible();
  await expect(page.getByRole("button", { name: "Fahrt bestätigen" })).toBeDisabled();

  const wa = page.getByTestId("wa-offer");
  const href = (await wa.getAttribute("href"))!;
  expect(href.startsWith("https://wa.me/491701234567?text=")).toBe(true); // (0) korrekt entfernt
  const text = decodeURIComponent(href.split("?text=")[1]!).replace(/ /g, " ");
  expect(text).toContain(`Auftragsnummer: ${mainRef}`);
  expect(text).toContain("E2E-Test Marienplatz 1");
  expect(text).toContain("09:45 Uhr");
  expect(text).toContain("S-Klasse");
  expect(await wa.getAttribute("target")).toBe("_blank");

  // Klick öffnet nur WhatsApp (neuer Tab) – es wird nichts automatisch versendet.
  // Externe Seite wird abgefangen, damit der Test keine echte WhatsApp-Seite lädt.
  await context.route("https://wa.me/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>wa</title>" }));
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  const [popup] = await Promise.all([context.waitForEvent("page"), wa.click()]);
  expect(popup.url()).toContain("https://wa.me/491701234567?text=");
  await popup.close();
  // Die Admin-Seite selbst hat keinen Versand ausgelöst (kein Server-Request an WhatsApp o. Ä.)
  expect(requests.filter((u) => /whatsapp|wa\.me|graph\.facebook/.test(u))).toEqual([]);
});

test("3 · Admin: ungültige Preise werden abgelehnt, „Bestätigt“ ohne Preis nicht möglich", async ({ page }) => {
  await adminLogin(page);
  await openDetail(page, mainRef);
  for (const bad of ["abc", "0", "-20", "12,345", "250000"]) {
    await page.locator("#price").fill(bad);
    await page.getByRole("button", { name: "Preis speichern" }).click();
    await expect(page.getByText("Bitte einen gültigen Preis eingeben", { exact: false })).toBeVisible();
  }
  await page.getByLabel("Status").selectOption("CONFIRMED");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByText("Bitte zuerst den vereinbarten Preis eintragen", { exact: false })).toBeVisible();
  const r = await row(mainRef);
  expect(r.status).toBe("RECEIVED");
  expect(r.agreedPrice).toBeNull();
});

test("4 · Admin: Preis 149,90 € eintragen → gespeichert, Status „In Bearbeitung“", async ({ page }) => {
  await adminLogin(page);
  await openDetail(page, mainRef);
  await page.locator("#price").fill("149,90");
  await page.getByRole("button", { name: "Preis speichern" }).click();
  await expect(page.getByText("Preis 149,90 € gespeichert.")).toBeVisible();
  await expect(page.getByText("Gespeichert: 149,90 €")).toBeVisible();
  const r = await row(mainRef);
  expect(r.agreedPrice).toBe("149.90");
  expect(r.priceAgreedAt).not.toBeNull();
  expect(r.status).toBe("IN_PROGRESS");
  await expect(page.getByText("Preis vereinbart: 149,90 €")).toBeVisible(); // Verlauf
});

test("5 · Admin: Fahrt bestätigen (Doppelklick) → einmal bestätigt, WhatsApp-Bestätigung mit Nummer und Preis", async ({ page }) => {
  await adminLogin(page);
  await openDetail(page, mainRef);
  const confirm = page.getByRole("button", { name: "Fahrt bestätigen" });
  await expect(confirm).toBeEnabled();
  await confirm.dblclick();
  await expect(page.getByText("Fahrt bestätigt (149,90 €).", { exact: false })).toBeVisible();
  const r = await row(mainRef);
  expect(r.status).toBe("CONFIRMED");
  expect(r.confirmedAt).not.toBeNull();
  const confirmations = await sql(`SELECT 1 FROM "BookingStatusChange" WHERE "bookingId" = $1 AND "toStatus" = 'CONFIRMED'`, [r.id]);
  expect(confirmations.length).toBe(1);

  await page.reload();
  const href = (await page.getByTestId("wa-confirm").getAttribute("href"))!;
  const text = decodeURIComponent(href.split("?text=")[1]!).replace(/ /g, " ");
  expect(text).toContain(`Auftragsnummer: ${mainRef}`);
  expect(text).toContain("Vereinbarter Fahrpreis: 149,90 €");
  expect(text).toContain("hiermit bestätigen wir Ihre Fahrt");
  // Bestätigte Fahrten lassen sich gefiltert anzeigen
  await page.goto("/admin?status=CONFIRMED");
  await expect(page.getByRole("link", { name: mainRef })).toBeVisible();
  const line = page.locator("tr", { hasText: mainRef });
  await expect(line).toContainText("149,90 €");
  await expect(line).toContainText("Bestätigt");
});

test("6 · Mehrere Buchungen (BMW 7er, Audi A8): eigene Nummern, keine Vermischung, Reihenfolge im Dashboard", async ({ page }) => {
  const a = await bookAsGuest(page, { vehicle: /BMW 7er/, email: mail("bmw"), firstName: "E2E-BMW", phone: "0171 2222222", time: "10:10", pickup: "E2E-Test Odeonsplatz 1, München" });
  const b = await bookAsGuest(page, { vehicle: /Audi A8/, email: mail("audi"), firstName: "E2E-Audi", phone: "0172 3333333", time: "11:20", days: 14, extraPassengers: 2 });
  expect(new Set([mainRef, a, b]).size).toBe(3);
  const ra = await row(a);
  const rb = await row(b);
  expect(ra).toMatchObject({ vehicleClass: "bmw7", firstName: "E2E-BMW", phone: "0171 2222222", pickupTime: "10:10", pickupAddress: "E2E-Test Odeonsplatz 1, München", passengers: 2 });
  expect(rb).toMatchObject({ vehicleClass: "audia8", firstName: "E2E-Audi", phone: "0172 3333333", pickupTime: "11:20", passengers: 3, pickupDate: futureDate(14) });

  await adminLogin(page);
  await page.goto("/admin?q=e2e-");
  const refs = await page.locator("tbody tr td:first-child a").allTextContents();
  const pos = (r: string) => refs.map((x) => x.trim()).indexOf(r);
  // Neueste zuerst: Audi vor BMW vor S-Klasse
  expect(pos(b)).toBeGreaterThanOrEqual(0);
  expect(pos(b)).toBeLessThan(pos(a));
  expect(pos(a)).toBeLessThan(pos(mainRef));
  await expect(page.locator("tr", { hasText: a })).toContainText("Eingegangen");
  await expect(page.locator("tr", { hasText: mainRef })).toContainText("Bestätigt");
  await openDetail(page, a);
  await expect(page.getByText("BMW 7er", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("E2E-BMW Fahrgast")).toBeVisible();
  await expect(page.getByText("E2E-Audi")).toHaveCount(0);
});

test("7 · Admin: Stornieren", async ({ page }) => {
  const ref = await bookAsGuest(page, { vehicle: /Mercedes-Benz S-Klasse/, email: mail("storno"), time: "14:00", days: 20 });
  await adminLogin(page);
  await openDetail(page, ref);
  page.once("dialog", (d) => void d.accept());
  await page.getByLabel("Grund der Stornierung").fill("E2E-Test: Absage durch den Fahrgast");
  await page.getByRole("button", { name: "Fahrt stornieren" }).click();
  await expect(page.getByText("Fahrt storniert.", { exact: false })).toBeVisible();
  expect((await row(ref)).status).toBe("CANCELLED");
  await page.reload();
  await expect(page.getByRole("button", { name: "Fahrt stornieren" })).toHaveCount(0);
  await expect(page.locator("#price")).toBeDisabled();
});

test.describe("Fehlerfälle im Buchungsformular", () => {
  async function toCustomerStep(page: Page) {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
    await page.goto("/#buchen");
    const form = page.locator("#buchen");
    await page.waitForTimeout(4500); // menschliche Ausfülldauer (Spam-Schutz)
    await form.locator("#pickupAddress").fill("E2E-Test Karlsplatz 1, München");
    await form.locator("#dropoffAddress").fill("E2E-Test Hauptbahnhof München");
    await form.locator("#pickupDate").fill(futureDate(9));
    await form.locator("#pickupTime").fill("16:00");
    await form.getByRole("button", { name: "Weiter", exact: true }).click();
    await form.getByRole("radio", { name: /Mercedes-Benz S-Klasse/ }).click();
    await form.getByRole("button", { name: "Weiter", exact: true }).click();
    return form;
  }

  test("ungültige Telefonnummer und fehlende Pflichtfelder", async ({ page }) => {
    const form = await toCustomerStep(page);
    await form.locator("#phone").fill("abc");
    await form.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(form.getByText("Bitte eine gültige Telefonnummer angeben.")).toBeVisible();
    await expect(form.getByText("Vorname ist erforderlich.")).toBeVisible();
    await expect(form.getByText("Bitte bestätigen Sie die Datenschutzhinweise.")).toBeVisible();
  });

  async function fillCustomer(form: ReturnType<Page["locator"]>, email: string) {
    await form.locator("#firstName").fill("E2E-Test");
    await form.locator("#lastName").fill("Fehlerfall");
    await form.locator("#email").fill(email);
    await form.locator("#phone").fill("0170 9999999");
    await form.locator('label[for="privacy"]').click();
    await form.getByRole("button", { name: "Weiter", exact: true }).click();
  }

  test("Doppelklick auf „Anfrage senden“ erzeugt genau eine Buchung", async ({ page }) => {
    const form = await toCustomerStep(page);
    const email = mail("doppelklick");
    await fillCustomer(form, email);
    await form.getByRole("button", { name: "Unverbindliches Angebot anfordern" }).dblclick();
    await page.waitForURL(/\/anfrage\/eingegangen/);
    const rows = await sql(`SELECT 1 FROM "BookingRequest" WHERE "email" = $1`, [email]);
    expect(rows.length).toBe(1);
  });

  test("Verbindungsabbruch: Fehlermeldung, keine Erfolgsseite, nichts gespeichert", async ({ page }) => {
    const form = await toCustomerStep(page);
    const email = mail("offline");
    await fillCustomer(form, email);
    await page.route("**/api/booking", (r) => r.abort("internetdisconnected"));
    await form.getByRole("button", { name: "Unverbindliches Angebot anfordern" }).click();
    await expect(form.getByText("Keine Verbindung.", { exact: false })).toBeVisible();
    await expect(page).not.toHaveURL(/eingegangen/);
    expect((await sql(`SELECT 1 FROM "BookingRequest" WHERE "email" = $1`, [email])).length).toBe(0);
    // Nach Wiederherstellung der Verbindung klappt das erneute Absenden
    await page.unroute("**/api/booking");
    await form.getByRole("button", { name: "Unverbindliches Angebot anfordern" }).click();
    await page.waitForURL(/\/anfrage\/eingegangen/);
    expect((await sql(`SELECT 1 FROM "BookingRequest" WHERE "email" = $1`, [email])).length).toBe(1);
  });

  test("Serverfehler (Datenbank nicht erreichbar): verständliche Meldung, keine Erfolgsseite", async ({ page }) => {
    const form = await toCustomerStep(page);
    await fillCustomer(form, mail("dbfehler"));
    // Antwort, wie sie der Server bei Datenbankausfall liefert (siehe api/booking: 503)
    await page.route("**/api/booking", (r) =>
      r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, message: "Ihre Anfrage konnte gerade nicht gespeichert werden. Bitte versuchen Sie es erneut oder rufen Sie uns an." }) }),
    );
    await form.getByRole("button", { name: "Unverbindliches Angebot anfordern" }).click();
    await expect(form.getByText("Ihre Anfrage konnte gerade nicht gespeichert werden.", { exact: false })).toBeVisible();
    await expect(page).not.toHaveURL(/eingegangen/);
  });

  test("ungültige Uhrzeit / Datum direkt an die API", async ({ request }) => {
    for (const [pickupDate, pickupTime] of [
      [futureDate(5), "25:99"],
      ["2027-02-30", "10:00"],
      ["morgen", "10:00"],
      ["2020-01-01", "10:00"],
    ]) {
      const res = await request.post("/api/booking", {
        headers: { "x-forwarded-for": randomIp() },
        data: { tripType: "ONE_WAY", pickupAddress: "E2E-Test A", dropoffAddress: "E2E-Test B", stops: [], pickupDate, pickupTime, passengers: 1, luggage: 0, vehicleClass: "first", firstName: "E2E", lastName: "Test", email: mail("api"), phone: "0170 1111111", privacy: true, website: "", startedAt: Date.now() - 30000 },
      });
      expect(res.status(), `${pickupDate} ${pickupTime}`).toBe(422);
    }
  });
});

test("Fahrzeugbilder: S-Klasse, BMW 7er und Audi A8 laden korrekt", async ({ page }) => {
  await page.goto("/");
  const fleet = page.locator("#flotte");
  await fleet.scrollIntoViewIfNeeded();
  for (const name of ["S-Klasse", "BMW 7", "Audi A8"]) {
    const img = fleet.locator(`img[alt*="${name}"]`).first();
    await img.scrollIntoViewIfNeeded();
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { message: name }).toBe(true);
  }
});
