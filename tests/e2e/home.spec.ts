import { expect, test } from "@playwright/test";

test.describe("Startseite", () => {
  test("lädt mit Branding, Hero-Texten und allen Abschnitten", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/");
    await expect(page).toHaveTitle(/DEENO/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Exklusivität beginnt mit Ihrer Fahrt.");
    await expect(page.getByText("Erleben Sie erstklassigen Chauffeur- und Limousinenservice", { exact: false })).toBeVisible();
    for (const id of ["start", "erlebnis", "leistungen", "flotte", "vorteile", "ueber-uns", "buchen", "faq", "kontakt"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });

  test("Kontakt-Links sind korrekt (Telefon, E-Mail, WhatsApp)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href="tel:+491607703472"]').first()).toBeAttached();
    await expect(page.locator('a[href="mailto:Firmawajdideeno@yahoo.com"]').first()).toBeAttached();
    const wa = await page.locator('a[href^="https://wa.me/491607703472"]').first().getAttribute("href");
    expect(decodeURIComponent(wa!.split("text=")[1]!)).toBe(
      "Guten Tag, ich interessiere mich für Ihren Chauffeur- und Limousinenservice und möchte gerne eine Fahrt anfragen.",
    );
    await expect(page.locator('a[href^="https://wa.me/"]').first()).toHaveAttribute("rel", /noopener/);
  });

  test("keine horizontale Scrollleiste", async ({ page }) => {
    await page.goto("/");
    for (const y of [0, 2000, 6000, 9000, 14000]) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });

  test("SEO: Metadaten, strukturierte Daten, robots und Sitemap", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Chauffeurservice/);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const business = ld.map((t) => JSON.parse(t)).find((d) => d["@type"] === "LocalBusiness");
    expect(business.telephone).toBe("+491607703472");
    expect(business.address.postalCode).toBe("82216");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect((await request.get("/sitemap.xml")).ok()).toBeTruthy();
    expect((await request.get("/opengraph-image")).headers()["content-type"]).toContain("image/png");
  });

  test("Sicherheits-Header gesetzt", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("Impressum und Datenschutz enthalten die Unternehmensdaten", async ({ page }) => {
    await page.goto("/impressum");
    await expect(page.getByText("Deeno Chauffeur- und Limousinenservice").first()).toBeVisible();
    await expect(page.getByText("Inhaber: Wajdi Deeno")).toBeVisible();
    await expect(page.getByText("Ganghoferstr. 29").first()).toBeVisible();
    await page.goto("/datenschutz");
    await expect(page.getByRole("heading", { name: "Datenschutzerklärung" })).toBeVisible();
    await expect(page.getByText("WhatsApp").first()).toBeVisible();
  });
});
