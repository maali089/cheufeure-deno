import { expect, test } from "@playwright/test";
import pg from "pg";
import Stripe from "stripe";
import { futureDate, randomIp } from "./helpers";

/**
 * Prüft den Stripe-Webhook lokal mit signierten Test-Ereignissen (ohne Stripe-Konto).
 * Voraussetzung: STRIPE_WEBHOOK_SECRET="whsec_local_test_secret" in .env.local und laufende lokale DB.
 */
const SECRET = process.env.E2E_STRIPE_WEBHOOK_SECRET ?? "whsec_local_test_secret";
const DB_URL = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable";
const stripe = new Stripe("sk_test_dummy");

function signed(payload: object) {
  const body = JSON.stringify(payload);
  return { body, header: stripe.webhooks.generateTestHeaderString({ payload: body, secret: SECRET }) };
}

function sessionEvent(id: string, session: Record<string, unknown>) {
  return { id, object: "event", type: "checkout.session.completed", api_version: "2025-01-01", created: Math.floor(Date.now() / 1000), data: { object: { object: "checkout.session", ...session } } };
}

test.describe.configure({ mode: "serial" });

test.describe("Stripe-Webhook", () => {
  let client: pg.Client;
  let bookingId = "";
  let reference = "";

  test.beforeAll(async ({ request }) => {
    client = new pg.Client({ connectionString: DB_URL });
    await client.connect();
    const res = await request.post("/api/booking", {
      headers: { "x-forwarded-for": randomIp() },
      data: {
        tripType: "ONE_WAY", pickupAddress: "Marienplatz 1, München", dropoffAddress: "Flughafen München", stops: [], pickupDate: futureDate(12), pickupTime: "09:00",
        passengers: 1, luggage: 1, vehicleClass: "first", firstName: "Zahl", lastName: "Test", email: `zahl+${Date.now()}@example.com`, phone: "+49 170 1111111", privacy: true, website: "", startedAt: Date.now() - 20000,
      },
    });
    reference = (await res.json()).reference;
    const r = await client.query(`SELECT id FROM "BookingRequest" WHERE reference = $1`, [reference]);
    bookingId = r.rows[0].id;
    // Simuliert eine gestartete Zahlung mit serverseitigem Festpreis 120,00 €
    await client.query(`UPDATE "BookingRequest" SET "paymentStatus"='PENDING', "quotedPrice"=120, "stripeCheckoutSessionId"=$2 WHERE id=$1`, [bookingId, `cs_test_${bookingId}`]);
  });

  test.afterAll(async () => {
    await client?.end();
  });

  test("ohne / mit falscher Signatur → 400", async ({ request }) => {
    expect((await request.post("/api/stripe/webhook", { data: "{}" })).status()).toBe(400);
    const bad = await request.post("/api/stripe/webhook", { data: "{}", headers: { "stripe-signature": "t=1,v1=deadbeef" } });
    expect(bad.status()).toBe(400);
  });

  test("falscher Betrag → keine Bestätigung", async ({ request }) => {
    const { body, header } = signed(sessionEvent(`evt_amount_${Date.now()}`, { id: `cs_test_${bookingId}`, payment_status: "paid", amount_total: 100, currency: "eur", metadata: { bookingId }, client_reference_id: bookingId }));
    const res = await request.post("/api/stripe/webhook", { data: body, headers: { "stripe-signature": header, "content-type": "application/json" } });
    expect(res.status()).toBe(200);
    const r = await client.query(`SELECT "paymentStatus", status FROM "BookingRequest" WHERE id=$1`, [bookingId]);
    expect(r.rows[0].paymentStatus).toBe("PENDING");
  });

  test("korrekte Zahlung → bezahlt & bestätigt, doppelte Ereignisse werden ignoriert", async ({ request }) => {
    const evt = sessionEvent(`evt_paid_${Date.now()}`, { id: `cs_test_${bookingId}`, payment_status: "paid", amount_total: 12000, currency: "eur", payment_intent: "pi_test_1", metadata: { bookingId }, client_reference_id: bookingId });
    const { body, header } = signed(evt);
    const first = await request.post("/api/stripe/webhook", { data: body, headers: { "stripe-signature": header, "content-type": "application/json" } });
    expect(first.status()).toBe(200);
    const again = await request.post("/api/stripe/webhook", { data: body, headers: { "stripe-signature": header, "content-type": "application/json" } });
    expect((await again.json()).duplicate).toBe(true);

    // Zweites, anderes Ereignis zur selben Session darf nicht erneut verarbeiten
    const evt2 = signed({ ...evt, id: `${evt.id}_b` });
    await request.post("/api/stripe/webhook", { data: evt2.body, headers: { "stripe-signature": evt2.header, "content-type": "application/json" } });

    const r = await client.query(`SELECT "paymentStatus", status, "amountPaidCents", "stripePaymentIntentId" FROM "BookingRequest" WHERE id=$1`, [bookingId]);
    expect(r.rows[0]).toMatchObject({ paymentStatus: "PAID", status: "CONFIRMED", amountPaidCents: 12000, stripePaymentIntentId: "pi_test_1" });
    const h = await client.query(`SELECT count(*)::int AS n FROM "BookingStatusChange" WHERE "bookingId"=$1 AND "changedBy"='stripe'`, [bookingId]);
    expect(h.rows[0].n).toBe(1);
  });

  test("fremde Session-ID wird keiner Buchung zugeordnet", async ({ request }) => {
    const { body, header } = signed(sessionEvent(`evt_foreign_${Date.now()}`, { id: "cs_test_fremd", payment_status: "paid", amount_total: 12000, currency: "eur", metadata: { bookingId }, client_reference_id: bookingId }));
    const res = await request.post("/api/stripe/webhook", { data: body, headers: { "stripe-signature": header, "content-type": "application/json" } });
    expect(res.status()).toBe(200);
  });

  test("ohne Preisregeln wird nie ein Checkout gestartet", async ({ request }) => {
    const res = await request.post("/api/booking", {
      headers: { "x-forwarded-for": randomIp() },
      data: {
        tripType: "ONE_WAY", pickupAddress: "Marienplatz 1, München", dropoffAddress: "Flughafen München", stops: [], pickupDate: futureDate(12), pickupTime: "10:00",
        passengers: 1, luggage: 1, vehicleClass: "first", firstName: "Kein", lastName: "Preis", email: `kein+${Date.now()}@example.com`, phone: "+49 170 2222222", privacy: true, website: "", startedAt: Date.now() - 20000, payNow: true,
      },
    });
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.checkoutUrl).toBeUndefined();
    const q = await request.post("/api/booking/quote", {
      headers: { "x-forwarded-for": randomIp() },
      data: { tripType: "ONE_WAY", pickupAddress: "Marienplatz 1, München", dropoffAddress: "Flughafen München", stops: [], pickupDate: futureDate(12), pickupTime: "10:00", passengers: 1, luggage: 1 },
    });
    const offers = (await q.json()).offers as { payable: boolean; price: unknown }[];
    expect(offers.every((o) => !o.payable && o.price === null)).toBe(true);
  });
});
