import { expect, test } from "@playwright/test";

async function scrollToProgress(page: import("@playwright/test").Page, p: number) {
  await page.locator("#erlebnis .pin-spacer").waitFor({ state: "attached" });
  await page.evaluate((prog) => {
    const el = document.getElementById("erlebnis")!;
    const spacer = el.querySelector(".pin-spacer") ?? el;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const len = spacer.getBoundingClientRect().height - window.innerHeight;
    window.scrollTo({ top: top + len * prog, behavior: "instant" });
  }, p);
  await page.waitForTimeout(1700); // Scrub-Glättung abwarten
}

const carX = (page: import("@playwright/test").Page) => page.locator('[data-r="car"]').getAttribute("transform");

test.describe("S-Klasse-Animation", () => {
  test("ist gepinnt und erzählt die Szenen in Reihenfolge", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.02);
    await expect(page.locator('[data-r="cap0"]')).toHaveCSS("opacity", "1");
    await scrollToProgress(page, 0.5);
    await expect(page.locator('[data-r="cap1"]')).toHaveCSS("opacity", "1");
    const doorOpen = await page.locator('[data-r="ambient"]').getAttribute("opacity");
    expect(Number(doorOpen)).toBeGreaterThan(0.8);
    await scrollToProgress(page, 0.8);
    await expect(page.locator('[data-r="cap2"]')).toHaveCSS("opacity", "1");
    await scrollToProgress(page, 1);
    await expect(page.getByText("Ihre Reise.")).toBeVisible();
    await page.getByRole("link", { name: /Jetzt Ihre Fahrt anfragen/ }).click();
    await expect(page.locator("#buchen")).toBeInViewport();
  });

  test("Rückwärtsscrollen ergibt denselben Zustand", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.15);
    const forward = await carX(page);
    await scrollToProgress(page, 0.85);
    await scrollToProgress(page, 0.15);
    const backward = await carX(page);
    expect(backward).toBe(forward);
  });

  test("Scrollweg ist kompakt (≤ 2,5 Bildschirmhöhen)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#erlebnis .pin-spacer").waitFor({ state: "attached" });
    const ratio = await page.evaluate(() => {
      const sp = document.querySelector("#erlebnis .pin-spacer")!;
      return (sp.getBoundingClientRect().height - window.innerHeight) / window.innerHeight;
    });
    expect(ratio).toBeLessThanOrEqual(2.5);
  });

  test("bei reduzierter Bewegung statische Darstellung ohne Pinning", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.locator("#erlebnis").scrollIntoViewIfNeeded();
    await expect(page.locator("#erlebnis .pin-spacer")).toHaveCount(0);
    await expect(page.locator("#erlebnis").getByText("Der Einstieg –", { exact: false })).toBeVisible();
    await ctx.close();
  });
});
