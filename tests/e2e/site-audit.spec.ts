import { expect, test, type Page } from "@playwright/test";
import { adminLogin } from "./helpers";

/**
 * Breiter Website-Check: Konsole, Links, Darstellung auf vielen Bildschirmgrößen, SEO-Grundlagen.
 * Läuft im Projekt „desktop“; Bildschirmgrößen werden je Test gesetzt.
 */

const VIEWPORTS = [
  { name: "kleines Smartphone 320", width: 320, height: 568 },
  { name: "iPhone SE 375", width: 375, height: 667 },
  { name: "iPhone 14 390", width: 390, height: 844 },
  { name: "Android 412", width: 412, height: 915 },
  { name: "Tablet hoch 768", width: 768, height: 1024 },
  { name: "Tablet quer 1024", width: 1024, height: 768 },
  { name: "Desktop 1440", width: 1440, height: 900 },
];

const PUBLIC_PAGES = ["/", "/impressum", "/datenschutz", "/bildnachweise", "/anfrage/eingegangen?nr=DN-261107-ABCDEF&m=1", "/admin/login"];

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  return errors;
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        // Elemente in bewusst scrollbaren Containern (z. B. Tabellen) ignorieren
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return false;
        }
        return r.right > w + 1;
      })
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
    return { scroll: document.documentElement.scrollWidth - w, wide };
  });
}

for (const vp of VIEWPORTS) {
  test(`Darstellung & Konsole · ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const errors = collectErrors(page);
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      // Einmal durchscrollen (lazy Bilder, Animationen)
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.8) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      const o = await horizontalOverflow(page);
      expect(o.scroll, `${path}: horizontales Scrollen (${o.wide.join(", ")})`).toBeLessThanOrEqual(1);
      const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => i.src));
      expect(broken, `${path}: defekte Bilder`).toEqual([]);
    }
    expect(errors, "Fehler in der Browser-Konsole").toEqual([]);
  });
}

test("Adminbereich auf dem Smartphone bedienbar (375 px)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const errors = collectErrors(page);
  await adminLogin(page);
  expect((await horizontalOverflow(page)).scroll).toBeLessThanOrEqual(1);
  const card = page.locator('ul[aria-label="Anfragen"] a').first();
  test.skip((await card.count()) === 0, "keine Anfragen in der Testdatenbank");
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByRole("heading", { name: /^DN-/ })).toBeVisible();
  expect((await horizontalOverflow(page)).scroll).toBeLessThanOrEqual(1);
  for (const name of ["Preis speichern", "Fahrt bestätigen"]) {
    const b = page.getByRole("button", { name });
    if (await b.count()) {
      const box = (await b.boundingBox())!;
      expect(box.height, `${name}: Touch-Fläche`).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
  }
  expect(errors).toEqual([]);
});

test("Alle internen Links und Sprungziele funktionieren", async ({ page, request }) => {
  const seen = new Set<string>();
  const missingAnchors: string[] = [];
  for (const path of ["/", "/impressum", "/datenschutz", "/bildnachweise"]) {
    await page.goto(path);
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")!));
    for (const h of hrefs) {
      if (/^(https?:|mailto:|tel:)/.test(h) && !h.startsWith("http://localhost")) continue;
      const [p, hash] = h.split("#");
      const target = p || path;
      if (hash && target === path && !(await page.locator(`[id="${hash}"]`).count())) missingAnchors.push(`${path} → #${hash}`);
      seen.add(target);
    }
  }
  for (const target of seen) {
    const res = await request.get(target, { maxRedirects: 0 });
    expect([200, 307, 308], target).toContain(res.status());
  }
  expect(missingAnchors).toEqual([]);
});

test("Externe Kontakt-Links sind korrekt aufgebaut", async ({ page }) => {
  await page.goto("/");
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")!));
  for (const h of hrefs.filter((x) => x.startsWith("tel:"))) expect(h).toMatch(/^tel:\+?\d{6,15}$/);
  for (const h of hrefs.filter((x) => x.startsWith("mailto:"))) expect(h).toMatch(/^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}/i);
  for (const h of hrefs.filter((x) => x.includes("wa.me"))) expect(h).toMatch(/^https:\/\/wa\.me\/\d{8,15}(\?text=.+)?$/);
  const external = await page.$$eval('a[target="_blank"]', (as) => as.map((a) => a.getAttribute("rel") ?? ""));
  for (const rel of external) expect(rel).toContain("noopener");
});

test("SEO-Grundlagen", async ({ page, request }) => {
  const titles = new Set<string>();
  for (const path of ["/", "/impressum", "/datenschutz", "/bildnachweise"]) {
    await page.goto(path);
    const title = await page.title();
    expect(title.length, `${path}: Titel`).toBeGreaterThan(10);
    titles.add(title);
    expect(await page.locator("html").getAttribute("lang")).toBe("de");
    expect(await page.locator('meta[name="description"]').getAttribute("content"), `${path}: Beschreibung`).toBeTruthy();
    expect(await page.locator("h1").count(), `${path}: genau eine H1`).toBe(1);
    expect(await page.locator('meta[name="viewport"]').count()).toBe(1);
    const noAlt = await page.$$eval("img", (imgs) => imgs.filter((i) => !i.hasAttribute("alt")).map((i) => i.src));
    expect(noAlt, `${path}: Bilder ohne alt`).toEqual([]);
  }
  expect(titles.size).toBe(4);
  await page.goto("/");
  expect(await page.locator('link[rel="canonical"]').count()).toBe(1);
  expect(await page.locator('meta[property="og:image"]').count()).toBeGreaterThan(0);
  const ld = await page.$$eval('script[type="application/ld+json"]', (x) => x.map((s) => (JSON.parse(s.textContent!) as { "@type": string })["@type"]));
  expect(ld).toEqual(expect.arrayContaining(["LocalBusiness", "FAQPage"]));
  expect((await request.get("/robots.txt")).status()).toBe(200);
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect((await request.get("/manifest.webmanifest")).status()).toBe(200);
  expect((await request.get("/gibt-es-nicht")).status()).toBe(404);
});

test("Performance (lokal, Richtwerte)", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "load" });
  const m = await page.evaluate(
    () =>
      new Promise<{ lcp: number; cls: number; transferKb: number; requests: number; domContentLoaded: number }>((resolve) => {
        let lcp = 0;
        let cls = 0;
        new PerformanceObserver((l) => l.getEntries().forEach((e) => (lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((l) =>
          l.getEntries().forEach((e) => {
            const s = e as PerformanceEntry & { value: number; hadRecentInput: boolean };
            if (!s.hadRecentInput) cls += s.value;
          }),
        ).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => {
          const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
          const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
          resolve({
            lcp: Math.round(lcp),
            cls: Math.round(cls * 1000) / 1000,
            transferKb: Math.round((res.reduce((a, r) => a + (r.transferSize || 0), 0) + (nav?.transferSize ?? 0)) / 1024),
            requests: res.length + 1,
            domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
          });
        }, 2500);
      }),
  );
  info.annotations.push({ type: "performance", description: JSON.stringify(m) });
  console.log("[performance /]", JSON.stringify(m));
  expect(m.cls, "Layout-Verschiebungen (CLS)").toBeLessThan(0.1);
  expect(m.lcp, "Largest Contentful Paint lokal").toBeLessThan(2500);
});
