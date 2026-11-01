import { expect, test } from "@playwright/test";
import { futureDate, randomIp } from "./helpers";

test.describe("Schwebender Buchungsbutton & Buchungsfenster", () => {
  test("öffnet, schließt (Esc / X) und behält Eingaben", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
    await page.goto("/");
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.2, behavior: "instant" }));
    await page.waitForTimeout(900);
    const fab = page.getByTestId("floating-booking");
    await expect(fab).toBeVisible();
    await expect(fab).toHaveText(/Jetzt Fahrt buchen/);

    await fab.click();
    const dialog = page.getByRole("dialog", { name: "Fahrt buchen" });
    await expect(dialog).toBeVisible();
    await dialog.locator("#pickupAddress").fill("Ganghoferstr. 29, 82216 Maisach");
    await dialog.locator("#dropoffAddress").fill("Flughafen München");
    await page.waitForTimeout(500);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(fab).toBeFocused();

    await fab.click();
    await expect(dialog.locator("#pickupAddress")).toHaveValue("Ganghoferstr. 29, 82216 Maisach");
    await dialog.getByRole("button", { name: "Buchungsfenster schließen" }).click();
    await expect(dialog).toBeHidden();

    // Inline-Formular übernimmt den Entwurf
    await expect(page.locator("#buchen #pickupAddress")).toHaveValue("Ganghoferstr. 29, 82216 Maisach");
  });

  test("kompletter Ablauf im Fenster endet ohne Preisregeln mit unverbindlicher Anfrage", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
    await page.goto("/impressum");
    await page.getByTestId("floating-booking").click();
    const d = page.getByRole("dialog", { name: "Fahrt buchen" });
    await d.getByRole("radio", { name: "Hin- und Rückfahrt" }).click();
    await d.locator("#pickupAddress").fill("Marienplatz 1, München");
    await d.locator("#dropoffAddress").fill("Schloss Nymphenburg, München");
    await d.locator("#pickupDate").fill(futureDate(8));
    await d.locator("#pickupTime").fill("18:00");
    await d.locator("#returnDate").fill(futureDate(8));
    await d.locator("#returnTime").fill("23:30");
    await d.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(d.getByText("Preis: individuelles Angebot").first()).toBeVisible();
    await d.getByRole("radio", { name: /Mercedes-Benz S-Klasse/ }).click();
    await d.getByRole("button", { name: "Weiter", exact: true }).click();
    await d.locator("#firstName").fill("Dialog");
    await d.locator("#lastName").fill("Test");
    await d.locator("#email").fill("dialog@example.com");
    await d.locator("#phone").fill("+49 170 7654321");
    await d.locator('label[for="privacy"]').click();
    await d.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(d.getByText("Es erfolgt keine Zahlung.", { exact: false })).toBeVisible();
    await expect(d.getByRole("button", { name: /bezahlen/i })).toHaveCount(0);
    await d.getByRole("button", { name: "Unverbindliches Angebot anfordern" }).click();
    await page.waitForURL(/\/anfrage\/eingegangen/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("booking-reference")).toHaveText(/^DN-/);
  });

  test("BMW 7er / Audi A8: Karten sichtbar, Button öffnet Buchung mit Vorauswahl", async ({ page }) => {
    await page.goto("/");
    for (const [slug, name] of [["bmw7", "BMW 7er"], ["audia8", "Audi A8"]] as const) {
      const card = page.locator(`#fleet-${slug}`);
      await card.scrollIntoViewIfNeeded();
      await expect(card).toHaveText(name);
      await expect(page.getByRole("img", { name: slug === "bmw7" ? /BMW 7er der Baureihe G70/ : /Audi A8 L der Baureihe D5/ })).toBeVisible();
    }
    await page.getByRole("button", { name: "Audi A8 – Jetzt Fahrt buchen" }).click();
    const d = page.getByRole("dialog", { name: "Fahrt buchen" });
    await expect(d).toBeVisible();
    await d.locator("#pickupAddress").fill("Marienplatz 1, München");
    await d.locator("#dropoffAddress").fill("Flughafen München");
    await d.locator("#pickupDate").fill(futureDate(9));
    await d.locator("#pickupTime").fill("09:00");
    await d.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(d.getByRole("radio", { name: /Audi A8/ })).toHaveAttribute("aria-checked", "true");
  });

  test("Mobil: Vollbild, nichts abgeschnitten", async ({ page, isMobile }) => {
    test.skip(!isMobile, "nur mobil");
    await page.goto("/");
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.2, behavior: "instant" }));
    await page.waitForTimeout(900);
    await page.getByTestId("floating-booking").click();
    const d = page.getByRole("dialog", { name: "Fahrt buchen" });
    const box = await d.boundingBox();
    const vp = page.viewportSize()!;
    expect(Math.round(box!.width)).toBe(vp.width);
    const overflow = await d.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const weiter = d.getByRole("button", { name: "Weiter", exact: true });
    await weiter.scrollIntoViewIfNeeded();
    await expect(weiter).toBeInViewport();
  });
});
