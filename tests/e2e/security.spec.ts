import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import pg from "pg";
import { createSessionToken, sessionIdHash } from "../../src/lib/server/session-token";
import { ADMIN_TOTP_SECRET, ADMIN_USER, adminLogin, futureDate, randomIp, totpNow } from "./helpers";

/**
 * Sicherheits-Regressionstests (siehe SECURITY_AUDIT.md, Abschnitt D).
 * Laufen ausschließlich gegen die lokale Testumgebung (next start + lokale PGlite-Datenbank).
 */

test.describe.configure({ mode: "serial" });

// next start läuft im Produktionsmodus → Cookie mit __Host-Präfix
const COOKIE = process.env.E2E_SESSION_COOKIE ?? "__Host-deeno_admin";
const DB_URL = process.env.E2E_DATABASE_URL ?? "";
const isLocalDb = (() => {
  try {
    return ["127.0.0.1", "localhost"].includes(new URL(DB_URL).hostname);
  } catch {
    return false;
  }
})();

async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: DB_URL.replace(/\?.*$/, ""), ssl: false });
  await client.connect();
  try {
    return (await client.query(query, params)).rows as T[];
  } finally {
    await client.end();
  }
}

const booking = (over: Record<string, unknown> = {}) => ({
  tripType: "ONE_WAY",
  pickupAddress: `Teststraße ${Math.floor(Math.random() * 1e6)}, München`,
  dropoffAddress: "Flughafen München",
  stops: [],
  pickupDate: futureDate(20),
  pickupTime: "09:15",
  passengers: 1,
  luggage: 0,
  vehicleClass: "business",
  firstName: "Sicherheit",
  lastName: "Test",
  email: `sec-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
  phone: "+49 170 0000000",
  privacy: true,
  website: "",
  startedAt: Date.now() - 30000,
  ...over,
});

const post = (request: APIRequestContext, data: unknown) => request.post("/api/booking", { data, headers: { "x-forwarded-for": randomIp() } });

async function sessionCookie(page: Page) {
  const c = (await page.context().cookies()).find((x) => x.name === COOKIE);
  expect(c, "Session-Cookie wurde gesetzt").toBeTruthy();
  return c!;
}

async function expectRedirectToLogin(request: APIRequestContext, path: string, cookie: string) {
  const res = await request.get(path, { maxRedirects: 0, headers: { cookie: `${COOKIE}=${cookie}` } });
  expect([302, 303, 307, 308], `${path} muss umleiten`).toContain(res.status());
  expect(res.headers()["location"]).toContain("/admin/login");
}

test.describe("Admin-Authentifizierung & Sitzungen", () => {
  test("Session-Cookie: HttpOnly, Secure, SameSite=Strict, __Host-Präfix", async ({ page }) => {
    await adminLogin(page);
    const c = await sessionCookie(page);
    expect(c.httpOnly).toBe(true);
    expect(c.secure).toBe(true);
    expect(c.sameSite).toBe("Strict");
    expect(c.path).toBe("/");
    expect(c.name.startsWith("__Host-")).toBe(true);
  });

  test("Logout widerruft die Sitzung serverseitig (gestohlenes Cookie danach wertlos)", async ({ page, request }) => {
    await adminLogin(page);
    const c = await sessionCookie(page);
    // Cookie funktioniert vor dem Logout
    const before = await request.get("/admin", { maxRedirects: 0, headers: { cookie: `${COOKIE}=${c.value}` } });
    expect(before.status()).toBe(200);
    await page.getByRole("button", { name: "Abmelden" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    // Dasselbe Cookie nach dem Logout erneut senden (Replay)
    for (const path of ["/admin", "/admin/nachrichten", "/admin/flotte"]) await expectRedirectToLogin(request, path, c.value);
  });

  test("gültig signiertes, aber nicht ausgestelltes Token wird abgelehnt (DB-Prüfung)", async ({ request }) => {
    const { token } = createSessionToken(ADMIN_USER);
    await expectRedirectToLogin(request, "/admin", token);
  });

  test("abgelaufenes Token und manipulierter Benutzername werden abgelehnt", async ({ request }) => {
    const expired = createSessionToken(ADMIN_USER, Date.now() - 9 * 3600 * 1000).token;
    await expectRedirectToLogin(request, "/admin", expired);
    const otherUser = createSessionToken("admin").token;
    await expectRedirectToLogin(request, "/admin", otherUser);
    await expectRedirectToLogin(request, "/admin", "x.y");
    await expectRedirectToLogin(request, "/admin", "");
  });

  test("Leerlauf-Timeout: Sitzung nach 30 Minuten Inaktivität ungültig", async ({ page, request }) => {
    test.skip(!isLocalDb, "nur mit lokaler Testdatenbank");
    await adminLogin(page);
    const c = await sessionCookie(page);
    const payload = JSON.parse(Buffer.from(c.value.split(".")[0]!, "base64url").toString()) as { sid: string };
    await sql(`UPDATE "AdminSession" SET "lastSeenAt" = NOW() - INTERVAL '31 minutes' WHERE "id" = $1`, [sessionIdHash(payload.sid)]);
    await expectRedirectToLogin(request, "/admin", c.value);
  });

  test("2FA: falscher, fehlender und wiederverwendeter Code werden abgelehnt", async ({ page }) => {
    test.skip(!ADMIN_TOTP_SECRET, "2FA lokal nicht konfiguriert");
    await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
    await page.goto("/admin/login");
    const pass = process.env.E2E_ADMIN_PASS ?? "deeno-local-admin-2026";
    const attempt = async (code: string) => {
      await page.locator("#username").fill(ADMIN_USER);
      await page.locator("#password").fill(pass);
      await page.locator("#totp").fill(code);
      await page.getByRole("button", { name: "Anmelden" }).click();
    };
    const wrong = totpNow() === "123456" ? "654321" : "123456";
    await attempt(wrong);
    await expect(page.getByText("Anmeldung fehlgeschlagen.", { exact: false })).toBeVisible();

    // Code einmal erfolgreich verwenden …
    await adminLogin(page);
    const c = (await page.context().cookies()).find((x) => x.name === COOKIE);
    expect(c).toBeTruthy();
    await page.getByRole("button", { name: "Abmelden" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    // … alle aktuell gültigen Codes wurden ggf. verbraucht; der direkt zuvor genutzte darf nicht erneut funktionieren
    const used = await sql<{ step: number }>(`SELECT "step" FROM "AdminTotpUse" ORDER BY "usedAt" DESC LIMIT 1`).catch(() => []);
    if (used[0]) {
      const { totpCode, base32Decode } = await import("../../src/lib/server/totp");
      await attempt(totpCode(base32Decode(ADMIN_TOTP_SECRET), used[0].step));
      await expect(page.getByText("Anmeldung fehlgeschlagen.", { exact: false })).toBeVisible();
    }
  });

  test("Brute-Force-Schutz: Login nach 8 Fehlversuchen pro IP gesperrt", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
    await page.goto("/admin/login");
    for (let i = 0; i < 9; i++) {
      await page.locator("#username").fill(ADMIN_USER);
      await page.locator("#password").fill(`falsch-${i}`);
      if (ADMIN_TOTP_SECRET) await page.locator("#totp").fill("000000");
      await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), page.getByRole("button", { name: "Anmelden" }).click()]);
      await expect(page.locator("p.field-error")).toBeVisible();
    }
    await expect(page.getByText("Zu viele Anmeldeversuche", { exact: false })).toBeVisible();
  });
});

test.describe("Server-Actions ohne gültige Sitzung", () => {
  test("Statusänderung per direktem POST ohne/mit widerrufener Sitzung bleibt wirkungslos", async ({ page, request }) => {
    test.skip(!isLocalDb, "nur mit lokaler Testdatenbank");
    const created = await post(request, booking());
    expect(created.status()).toBe(200);
    const { reference } = (await created.json()) as { reference: string };
    const [row] = await sql<{ id: string }>(`SELECT "id" FROM "BookingRequest" WHERE "reference" = $1`, [reference]);

    // Als Admin die Detailseite laden, um die (öffentlich im HTML stehende) Action-ID zu ermitteln
    await adminLogin(page);
    const c = await sessionCookie(page);
    await page.goto(`/admin/anfragen/${row!.id}`);
    const html = await page.content();
    const actionField = /name="(\$ACTION_ID_[a-f0-9]+)"/.exec(html)?.[1];
    expect(actionField, "Server-Action-ID im Formular gefunden").toBeTruthy();
    await page.getByRole("button", { name: "Abmelden" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);

    const base = new URL(page.url()).origin;
    for (const cookie of ["", `${COOKIE}=${c.value}` /* nach Logout widerrufen */]) {
      await request.post(`/admin/anfragen/${row!.id}`, {
        maxRedirects: 0,
        headers: { origin: base, ...(cookie ? { cookie } : {}) },
        multipart: { [actionField!]: "", id: row!.id, status: "CONFIRMED", note: "unbefugt" },
      });
    }
    const [after] = await sql<{ status: string }>(`SELECT "status" FROM "BookingRequest" WHERE "id" = $1`, [row!.id]);
    expect(after!.status).toBe("RECEIVED");
    const history = await sql(`SELECT 1 FROM "BookingStatusChange" WHERE "bookingId" = $1 AND "note" = 'unbefugt'`, [row!.id]);
    expect(history.length).toBe(0);
  });
});

test.describe("Öffentliche Formulare: Injection, Manipulation, Missbrauch", () => {
  test("Mass Assignment: interne Felder lassen sich nicht setzen", async ({ request }) => {
    test.skip(!isLocalDb, "nur mit lokaler Testdatenbank");
    const res = await post(request, booking({ status: "CONFIRMED", paymentStatus: "PAID", quotedPrice: 1, adminNotes: "hack", reference: "DN-000000-AAAAAA", id: "x", amountPaidCents: 1 }));
    expect(res.status()).toBe(200);
    const { reference } = (await res.json()) as { reference: string };
    expect(reference).not.toBe("DN-000000-AAAAAA");
    const [row] = await sql<Record<string, unknown>>(`SELECT "status","paymentStatus","quotedPrice","adminNotes","amountPaidCents" FROM "BookingRequest" WHERE "reference" = $1`, [reference]);
    expect(row).toMatchObject({ status: "RECEIVED", paymentStatus: "NOT_REQUIRED", quotedPrice: null, adminNotes: null, amountPaidCents: null });
  });

  test("SQL-Injection-Payloads werden als Text gespeichert, Admin-Suche bleibt stabil", async ({ page, request }) => {
    const payload = "Robert'); DROP TABLE \"BookingRequest\";--";
    const res = await post(request, booking({ lastName: payload, tripNotes: "' OR '1'='1" }));
    expect(res.status()).toBe(200);
    const { reference } = (await res.json()) as { reference: string };
    await adminLogin(page);
    await page.goto(`/admin?q=${encodeURIComponent("' OR 1=1 --")}`);
    await expect(page.getByRole("heading", { name: "Buchungsanfragen" })).toBeVisible();
    await expect(page.getByRole("link", { name: reference })).toHaveCount(0);
    await page.goto(`/admin?q=${encodeURIComponent(reference)}`);
    await expect(page.getByRole("link", { name: reference })).toBeVisible();
  });

  test("XSS-Payloads werden im Adminbereich nur als Text dargestellt", async ({ page, request }) => {
    const xss = '<img src=x onerror="window.__xss=1">';
    const res = await post(request, booking({ firstName: "<script>window.__xss=1</script>", tripNotes: xss, specialRequests: xss, company: xss }));
    expect(res.status()).toBe(200);
    const { reference } = (await res.json()) as { reference: string };
    let dialog = false;
    page.on("dialog", (d) => {
      dialog = true;
      void d.dismiss();
    });
    await adminLogin(page);
    await page.goto(`/admin?q=${encodeURIComponent(reference)}`);
    await page.getByRole("link", { name: reference }).click();
    await expect(page.getByRole("heading", { name: reference })).toBeVisible();
    await expect(page.getByText(xss).first()).toBeVisible(); // als Text sichtbar
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(dialog).toBe(false);
  });

  test("Doppelte Übermittlung (Replay) wird erkannt", async ({ request }) => {
    const data = booking();
    expect((await post(request, data)).status()).toBe(200);
    const second = await post(request, data);
    expect(second.status()).toBe(409);
  });

  test("Falscher Content-Type, ungültiges JSON und Cross-Site-Formular werden abgelehnt", async ({ request }) => {
    const form = await request.post("/api/booking", { form: { firstName: "x" }, headers: { "x-forwarded-for": randomIp() } });
    expect(form.status()).toBe(400);
    const broken = await request.post("/api/booking", { data: Buffer.from("{kaputt"), headers: { "content-type": "application/json", "x-forwarded-for": randomIp() } });
    expect(broken.status()).toBe(400);
    const cross = await request.post("/api/contact", { data: { name: "x" }, headers: { origin: "https://evil.example", "x-forwarded-for": randomIp() } });
    expect(cross.status()).toBe(403);
  });

  test("Fehlermeldungen enthalten keine internen Details", async ({ request }) => {
    const res = await post(request, booking({ passengers: "abc", vehicleClass: "x".repeat(50) }));
    const text = await res.text();
    expect(text).not.toMatch(/prisma|stack|at \w+ \(|node_modules|SELECT|postgres/i);
  });

  test("Kontaktformular: Rate-Limit greift", async ({ request }) => {
    const ip = randomIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await request.post("/api/contact", { data: { name: "x" }, headers: { "x-forwarded-for": ip } });
      statuses.push(r.status());
    }
    expect(statuses.slice(0, 4).every((s) => s === 422)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  test("Adress-API lehnt Aufrufe fremder Websites ab", async ({ request }) => {
    const res = await request.get("/api/places?q=Marienplatz", { headers: { "sec-fetch-site": "cross-site" } });
    expect(res.status()).toBe(403);
  });

  test("Keine öffentliche Lese-/Änderungs-API für Anfragen; Bestätigungsseite ohne Kundendaten", async ({ request, page }) => {
    for (const m of ["get", "put", "delete", "patch"] as const) {
      const r = await request[m]("/api/booking", { headers: { "x-forwarded-for": randomIp() } });
      expect([404, 405]).toContain(r.status());
    }
    expect([404, 405]).toContain((await request.get("/api/booking/abc")).status());
    const res = await post(request, booking({ lastName: "Geheimname" }));
    const { reference } = (await res.json()) as { reference: string };
    await page.goto(`/anfrage/eingegangen?nr=${reference}`);
    await expect(page.getByTestId("booking-reference")).toHaveText(reference);
    expect(await page.content()).not.toContain("Geheimname");
  });
});

test.describe("Datenbank-Härtung (lokal)", () => {
  test("Row Level Security ist für alle Tabellen aktiv", async () => {
    test.skip(!isLocalDb, "nur mit lokaler Testdatenbank");
    const rows = await sql<{ relname: string; relrowsecurity: boolean }>(
      `SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(rows.filter((r) => !r.relrowsecurity).map((r) => r.relname)).toEqual([]);
  });

  test("Rate-Limit- und Sitzungstabellen enthalten keine Klartext-IPs oder Tokens", async ({ page }) => {
    test.skip(!isLocalDb, "nur mit lokaler Testdatenbank");
    await adminLogin(page);
    const c = await sessionCookie(page);
    const sessions = await sql<{ id: string }>(`SELECT "id" FROM "AdminSession"`);
    expect(sessions.every((s) => !c.value.includes(s.id))).toBe(true);
    const keys = await sql<{ key: string }>(`SELECT "key" FROM "RateLimitBucket" LIMIT 200`);
    expect(keys.every((k) => !/\d+\.\d+\.\d+\.\d+|@|:/.test(k.key))).toBe(true);
  });
});
