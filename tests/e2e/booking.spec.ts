import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASS, ADMIN_USER, futureDate, randomIp } from "./helpers";

test.describe.configure({ mode: "serial" });

let reference = "";

async function openForm(page: Page) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await page.goto("/#buchen");
  await page.locator("#buchen").scrollIntoViewIfNeeded();
}

test("Schritt 1: Pflichtfelder und ungültige Eingaben werden gemeldet", async ({ page }) => {
  await openForm(page);
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await expect(page.getByText("Abholadresse ist zu kurz.").or(page.getByText("Abholadresse ist erforderlich."))).toBeVisible();
  await expect(page.getByText("Bitte geben Sie eine Zieladresse an.")).toBeVisible();
  await expect(page.getByText("Bitte wählen Sie ein Datum.")).toBeVisible();

  await page.locator("#pickupAddress").fill("Marienplatz 1, 80331 München");
  await page.locator("#dropoffAddress").fill("Flughafen München, Terminal 2");
  await page.locator("#pickupDate").fill("2020-01-01");
  await page.locator("#pickupTime").fill("10:00");
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await expect(page.getByText("Der Abholzeitpunkt muss in der Zukunft liegen.")).toBeVisible();
});

test("Schritt 1: Zusatzfelder je nach Fahrtart", async ({ page }) => {
  await openForm(page);
  await page.getByRole("radio", { name: "Hin- und Rückfahrt" }).click();
  await expect(page.locator("#returnDate")).toBeVisible();
  await expect(page.locator("#returnTime")).toBeVisible();
  await page.getByRole("radio", { name: "Stundenbuchung" }).click();
  await expect(page.locator("#durationHours")).toBeVisible();
  await expect(page.locator("#returnDate")).toHaveCount(0);
  await page.getByRole("radio", { name: "Flughafentransfer" }).click();
  await expect(page.locator("#flightNumber")).toBeVisible();
});

test("vollständige Buchungsanfrage → Bestätigungsseite mit Anfragenummer", async ({ page }) => {
  await openForm(page);
  await page.getByRole("radio", { name: "Flughafentransfer" }).click();
  await page.locator("#pickupAddress").fill("Ganghoferstr. 29, 82216 Maisach");
  await page.locator("#dropoffAddress").fill("Flughafen München, Terminal 1");
  await page.getByRole("button", { name: /Zwischenstopp hinzufügen/ }).click();
  await page.locator("#stop-0").fill("Olching Bahnhof");
  await page.locator("#pickupDate").fill(futureDate(5));
  await page.locator("#pickupTime").fill("06:30");
  await page.getByRole("button", { name: "Personen erhöhen" }).click();
  await page.locator("#flightNumber").fill("LH 2034");
  await page.getByRole("button", { name: "Weiter", exact: true }).click();

  // Schritt 2: ohne Auswahl → Fehler
  await expect(page.getByRole("heading", { name: "Ihr Fahrzeug" })).toBeVisible();
  await expect(page.getByText("Vorgeschlagene Flottenkonfiguration", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Unverbindliches Angebot anfordern.")).toBeVisible();
  await expect(page.locator("#buchen").getByText("Preis: individuelles Angebot").first()).toBeVisible();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await expect(page.getByText("Bitte wählen Sie eine Fahrzeugklasse.")).toBeVisible();
  await page.getByRole("radio", { name: /Mercedes-Benz S-Klasse/ }).click();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();

  // Schritt 3: Validierung
  await expect(page.getByRole("heading", { name: "Ihre Kontaktdaten" })).toBeVisible();
  await page.locator("#email").fill("kein-mail");
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await expect(page.getByText("Bitte eine gültige E-Mail-Adresse angeben.")).toBeVisible();
  await expect(page.getByText("Bitte bestätigen Sie die Datenschutzhinweise.")).toBeVisible();
  await page.locator("#firstName").fill("Erika");
  await page.locator("#lastName").fill("Testkundin");
  await page.locator("#email").fill("erika.test@example.com");
  await page.locator("#phone").fill("+49 170 1234567");
  await page.locator("#company").fill("Muster GmbH");
  await page.locator('label[for="privacy"]').click();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();

  // Schritt 4: Übersicht + Ändern
  await expect(page.getByRole("heading", { name: "Ihre Anfrage im Überblick" })).toBeVisible();
  await expect(page.getByText("Olching Bahnhof")).toBeVisible();
  await expect(page.getByText("LH 2034")).toBeVisible();
  await expect(page.getByText("Mercedes-Benz S-Klasse · First Class")).toBeVisible();
  const wa = await page.getByRole("link", { name: /Fahrtdaten in WhatsApp übernehmen/ }).getAttribute("href");
  expect(decodeURIComponent(wa!)).not.toContain("erika.test@example.com");
  await page.getByRole("button", { name: "Ändern" }).nth(2).click();
  await expect(page.locator("#firstName")).toHaveValue("Erika");
  await page.getByRole("button", { name: "Weiter", exact: true }).click();

  await page.getByRole("button", { name: "Unverbindliches Angebot anfordern" }).click();
  await page.waitForURL(/\/anfrage\/eingegangen/);
  await expect(page.getByRole("heading", { name: "Ihre Buchungsanfrage ist eingegangen." })).toBeVisible();
  await expect(page.getByText("Wir melden uns zur Bestätigung Ihrer Fahrt.")).toBeVisible();
  reference = (await page.getByTestId("booking-reference").textContent())!.trim();
  expect(reference).toMatch(/^DN-\d{6}-[A-Z0-9]{6}$/);
  // Ohne E-Mail-Dienst darf kein erfolgreicher Versand behauptet werden
  await expect(page.getByText("konnte nicht versendet werden", { exact: false })).toBeVisible();
});

test("Adminbereich: geschützt, Anfrage gespeichert, Status änderbar", async ({ page }) => {
  expect(reference).not.toBe("");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);

  await page.locator("#username").fill(ADMIN_USER);
  await page.locator("#password").fill("falsches-passwort");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByText("Benutzername oder Passwort ist falsch.")).toBeVisible();

  await page.locator("#password").fill(ADMIN_PASS);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: "Buchungsanfragen" })).toBeVisible();

  await page.getByLabel("Suche").fill(reference);
  await page.getByRole("button", { name: "Suchen" }).click();
  await page.getByRole("link", { name: reference }).click();
  await expect(page.getByRole("heading", { name: reference })).toBeVisible();
  await expect(page.getByText("Ganghoferstr. 29, 82216 Maisach")).toBeVisible();
  await expect(page.getByText("Olching Bahnhof")).toBeVisible();
  await expect(page.getByText("erika.test@example.com")).toBeVisible();

  await page.getByLabel("Status").selectOption("IN_PROGRESS");
  await page.getByLabel("Notiz", { exact: true }).fill("Verfügbarkeit wird geprüft");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByText("Verfügbarkeit wird geprüft")).toBeVisible();
  await expect(page.locator("span", { hasText: "In Bearbeitung" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto(`/admin`);
  await expect(page).toHaveURL(/\/admin\/login/);
});
