// Visuelle Prüfung: erstellt Screenshots von Hero, Story-Animation (mehrere Fortschrittspunkte) und Abschnitten.
//   node tests/visual/capture.mjs [baseUrl] [outDir] [viewport=desktop|mobile|tablet] [progress-list]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "test-results/visual";
const vpName = process.argv[4] ?? "desktop";
const points = (process.argv[5] ?? "0,0.06,0.13,0.18,0.22,0.27,0.3,0.34,0.45,0.55,0.66,0.72,0.76,0.8,0.84,0.88,0.93,1").split(",").map(Number);
const viewports = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 }, tablet: { width: 820, height: 1180 } };
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: viewports[vpName], deviceScaleFactor: 1, isMobile: vpName === "mobile", hasTouch: vpName !== "desktop" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(3200);
await page.screenshot({ path: `${out}/${vpName}-00-hero.png` });

const info = await page.evaluate(() => {
  const el = document.getElementById("erlebnis");
  const spacer = el.querySelector(".pin-spacer") ?? el;
  return { top: el.getBoundingClientRect().top + window.scrollY, h: spacer.getBoundingClientRect().height - window.innerHeight };
});
for (const p of points) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), info.top + info.h * p);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${out}/${vpName}-story-${String(Math.round(p * 100)).padStart(3, "0")}.png` });
}
for (const id of ["leistungen", "flotte", "vorteile", "ueber-uns", "buchen", "faq", "kontakt", "site-footer"]) {
  await page.evaluate((i) => document.getElementById(i)?.scrollIntoView({ behavior: "instant" }), id);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${vpName}-sec-${id}.png` });
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log(JSON.stringify({ vpName, storyTop: info.top, pinLength: info.h, horizontalOverflow: overflow, errors }, null, 2));
await browser.close();
