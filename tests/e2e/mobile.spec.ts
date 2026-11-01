import { expect, test } from "@playwright/test";

test.describe("Mobil", () => {
  test.skip(({ isMobile }) => !isMobile, "nur mobil");

  test("Menü öffnet, navigiert und schließt", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menü öffnen" }).click();
    const menu = page.getByRole("dialog", { name: "Navigation" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "Anrufen" })).toHaveAttribute("href", "tel:+491607703472");
    await menu.getByRole("link", { name: /Fahrzeugflotte/ }).click();
    await expect(menu).toBeHidden();
    await expect(page.locator("#flotte")).toBeInViewport();
  });

  test("Schwebender Buchungsbutton erreichbar und blendet sich über Formular aus", async ({ page }) => {
    await page.goto("/");
    const fab = page.getByTestId("floating-booking");
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.2, behavior: "instant" }));
    await expect(fab.locator("..")).toHaveCSS("opacity", "1");
    await expect(fab).toBeInViewport();
    const box = (await fab.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    await page.evaluate(() => document.getElementById("buchen")!.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForTimeout(1000);
    await expect(fab.locator("..")).toHaveCSS("opacity", "0");
  });

  test("Unterseiten ohne horizontales Überlaufen", async ({ page }) => {
    for (const path of ["/", "/impressum", "/datenschutz", "/bildnachweise", "/admin/login"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
