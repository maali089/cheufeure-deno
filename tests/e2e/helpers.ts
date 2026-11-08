import { config as loadEnv } from "dotenv";
import { expect, type Page } from "@playwright/test";
import { base32Decode, currentStep, totpCode } from "../../src/lib/server/totp";

export const randomIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

export function futureDate(days: number) {
  const d = new Date(Date.now() + days * 86400000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts; // YYYY-MM-DD
}

export const ADMIN_USER = process.env.E2E_ADMIN_USER ?? "deeno";
export const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? "deeno-local-admin-2026";

// 2FA: Testschlüssel aus .env.local (lokal) bzw. E2E_ADMIN_TOTP_SECRET
loadEnv({ path: ".env.local", quiet: true });
export const ADMIN_TOTP_SECRET = process.env.E2E_ADMIN_TOTP_SECRET ?? process.env.ADMIN_TOTP_SECRET ?? "";

/** Aktueller 2FA-Code; offset > 0 liefert den Code des nächsten Zeitschritts. */
export const totpNow = (offset = 0) => (ADMIN_TOTP_SECRET ? totpCode(base32Decode(ADMIN_TOTP_SECRET), currentStep() + offset) : "");

/**
 * Admin-Anmeldung über das Formular. Jeder 2FA-Code ist nur einmal gültig – bei Kollision
 * mit einem bereits verbrauchten Code wird der Code des nächsten Zeitschritts versucht.
 */
export async function adminLogin(page: Page) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await page.goto("/admin/login");
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.locator("#username").fill(ADMIN_USER);
    await page.locator("#password").fill(ADMIN_PASS);
    if (ADMIN_TOTP_SECRET) await page.locator("#totp").fill(totpNow(attempt % 2));
    await page.getByRole("button", { name: "Anmelden" }).click();
    const ok = await page
      .getByRole("heading", { name: "Buchungsanfragen" })
      .waitFor({ timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (ok) return;
    // Codes dieses Zeitfensters bereits verbraucht → auf den nächsten Zeitschritt warten
    if (attempt % 2 === 1) await page.waitForTimeout(30_000 - (Date.now() % 30_000) + 500);
  }
  await expect(page.getByRole("heading", { name: "Buchungsanfragen" })).toBeVisible();
}
