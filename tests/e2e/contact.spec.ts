import { expect, test } from "@playwright/test";
import { randomIp } from "./helpers";

test("Kontaktformular: Validierung und ehrliche Bestätigung", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await page.goto("/#kontakt");
  const form = page.getByRole("form", { name: "Kontaktformular" });
  await form.getByRole("button", { name: /Nachricht senden/ }).click();
  await expect(form.getByText("Name ist erforderlich.").or(form.getByText("Name ist zu kurz."))).toBeVisible();
  await expect(form.getByText("Bitte wählen Sie einen Betreff.")).toBeVisible();

  await page.locator("#ct-name").fill("Erika Kontakt");
  await page.locator("#ct-email").fill("erika.kontakt@example.com");
  await page.locator("#ct-subject").selectOption("Firmenkunden");
  await page.locator("#ct-message").fill("Wir interessieren uns für regelmäßige Fahrten für unsere Gäste.");
  await page.locator('label[for="ct-privacy"]').click();
  await page.waitForTimeout(2600); // Mindest-Ausfülldauer (Spam-Schutz)
  await form.getByRole("button", { name: /Nachricht senden/ }).click();
  await expect(page.getByText("Vielen Dank für Ihre Nachricht.")).toBeVisible();
  // Lokal ohne E-Mail-Dienst: Nachricht gespeichert, kein behaupteter E-Mail-Versand
  await expect(page.getByText("wurde gespeichert", { exact: false })).toBeVisible();
});
