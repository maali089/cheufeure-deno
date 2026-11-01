import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { bookingCustomerMail, bookingOperatorMail } from "@/lib/mail/templates";
import { mailConfig, sendMail, type MailResult } from "@/lib/mail/transport";
import { createBookingReference } from "@/lib/reference";
import { db, isDatabaseConfigured } from "@/lib/server/db";
import { getFleetWithSettings } from "@/lib/server/fleet-settings";
import { computeRoute } from "@/lib/server/maps";
import { offersForTrip, stripe, toCents } from "@/lib/server/payments";
import { siteUrl } from "@/config/company";
import { vehicleLabel } from "@/config/fleet";
import { formatDateDe } from "@/lib/datetime";
import { rateLimit } from "@/lib/server/rate-limit";
import { PayloadError, clientIp, isSameOrigin, jsonError, looksLikeSpam, readJson } from "@/lib/server/request-guard";
import { bookingSchema, flattenIssues, tripTypeLabels } from "@/lib/validation";

export const runtime = "nodejs";

const describe = (r: MailResult) => (r.status === "sent" ? null : r.status === "failed" ? `failed: ${r.error}` : r.status === "disabled" ? `disabled: ${r.reason}` : "logged (dev)");

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "Ungültige Herkunft der Anfrage.");

  const limit = rateLimit(`booking:${clientIp(req)}`, 5, 10 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es später erneut oder rufen Sie uns an.");

  let body: unknown;
  try {
    body = await readJson(req);
  } catch (e) {
    return jsonError(400, e instanceof PayloadError ? e.message : "Ungültige Anfrage.");
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "Bitte prüfen Sie Ihre Angaben.", flattenIssues(parsed.error));
  const data = parsed.data;

  // Spam-Schutz: Honeypot → stillschweigend verwerfen
  if (data.website) return NextResponse.json({ ok: true, reference: createBookingReference(), customerMail: "sent" });
  if (looksLikeSpam(data, 4000)) return jsonError(400, "Die Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.");

  const fleet = await getFleetWithSettings();
  const vehicle = fleet.find((v) => v.slug === data.vehicleClass);
  if (!vehicle?.enabled) {
    return jsonError(422, "Diese Fahrzeugklasse ist derzeit nicht anfragbar.", { vehicleClass: "Bitte wählen Sie eine andere Fahrzeugklasse." });
  }

  if (!isDatabaseConfigured()) {
    console.error("[booking] DATABASE_URL fehlt – Anfrage kann nicht gespeichert werden.");
    return jsonError(503, "Online-Anfragen sind momentan nicht verfügbar. Bitte kontaktieren Sie uns telefonisch oder per E-Mail.");
  }

  const stops = data.stops.map((s) => s.address).filter((s) => s.length > 0);

  // Optionale echte Routenberechnung (nur wenn konfiguriert) – keine geschätzten Werte.
  // Zahlung nur, wenn der Server einen verbindlichen Preis ermittelt und alle Freigaben vorliegen
  const wantsPayment = (body as { payNow?: unknown } | null)?.payNow === true;
  let payable: { amount: number; rulesVersion: string } | null = null;
  let pricedRoute: { distanceMeters: number; durationSeconds: number } | null = null;
  if (wantsPayment) {
    const { offers, route: r } = await offersForTrip(
      {
        tripType: data.tripType,
        pickupAddress: data.pickupAddress,
        pickupPlaceId: data.pickupPlaceId,
        dropoffAddress: data.dropoffAddress,
        dropoffPlaceId: data.dropoffPlaceId,
        stops,
        durationHours: data.tripType === "HOURLY" ? data.durationHours : undefined,
        pickupDate: data.pickupDate,
        pickupTime: data.pickupTime,
      },
      fleet,
      data.passengers,
      data.luggage,
    );
    const offer = offers.find((o) => o.slug === data.vehicleClass);
    if (offer?.payable && offer.quote.kind === "fixed") payable = { amount: offer.quote.amount, rulesVersion: offer.quote.rulesVersion };
    pricedRoute = r;
  }

  const route =
    pricedRoute ??
    (data.dropoffAddress && data.tripType !== "HOURLY"
      ? await computeRoute({ address: data.pickupAddress, placeId: data.pickupPlaceId }, { address: data.dropoffAddress, placeId: data.dropoffPlaceId }, stops.map((address) => ({ address })))
      : null);

  // Speichern (mit Wiederholung bei Kollision der Anfragenummer)
  let booking: { id: string; reference: string } | null = null;
  for (let attempt = 0; attempt < 4 && !booking; attempt++) {
    try {
      booking = await db().bookingRequest.create({
        data: {
          reference: createBookingReference(),
          tripType: data.tripType,
          pickupAddress: data.pickupAddress,
          pickupPlaceId: data.pickupPlaceId,
          dropoffAddress: data.dropoffAddress,
          dropoffPlaceId: data.dropoffPlaceId,
          stops,
          pickupDate: data.pickupDate,
          pickupTime: data.pickupTime,
          returnDate: data.tripType === "ROUND_TRIP" ? data.returnDate : null,
          returnTime: data.tripType === "ROUND_TRIP" ? data.returnTime : null,
          durationHours: data.tripType === "HOURLY" ? data.durationHours : null,
          passengers: data.passengers,
          luggage: data.luggage,
          flightNumber: data.flightNumber?.toUpperCase(),
          tripNotes: data.tripNotes,
          vehicleClass: data.vehicleClass,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email.toLowerCase(),
          phone: data.phone,
          company: data.company,
          specialRequests: data.specialRequests,
          privacyAckAt: new Date(),
          distanceMeters: route?.distanceMeters,
          durationSeconds: route?.durationSeconds,
          quotedPrice: payable?.amount,
          pricingSource: payable ? `rules:${payable.rulesVersion}` : null,
          paymentStatus: payable ? "PENDING" : "NOT_REQUIRED",
          statusHistory: { create: { toStatus: "RECEIVED", changedBy: "website", note: "Anfrage über die Website eingegangen" } },
        },
        select: { id: true, reference: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      console.error("[booking] Speichern fehlgeschlagen:", e instanceof Error ? e.message : e);
      return jsonError(503, "Ihre Anfrage konnte gerade nicht gespeichert werden. Bitte versuchen Sie es erneut oder rufen Sie uns an.");
    }
  }
  if (!booking) return jsonError(503, "Ihre Anfrage konnte gerade nicht gespeichert werden. Bitte versuchen Sie es erneut.");

  // Benachrichtigungen
  const cfg = mailConfig();
  const op = bookingOperatorMail(data, booking.reference);
  const cu = bookingCustomerMail(data, booking.reference);
  const [opResult, cuResult] = await Promise.all([
    sendMail({ to: cfg.operatorTo, subject: op.subject, html: op.html, text: op.text, replyTo: data.email }),
    sendMail({ to: data.email, subject: cu.subject, html: cu.html, text: cu.text, replyTo: cfg.replyTo }),
  ]);

  const errors = [describe(opResult) && `operator ${describe(opResult)}`, describe(cuResult) && `customer ${describe(cuResult)}`].filter(Boolean);
  if (errors.length) console.warn(`[booking] ${booking.reference}: E-Mail-Status – ${errors.join("; ")}`);

  try {
    await db().bookingRequest.update({
      where: { id: booking.id },
      data: {
        operatorNotifiedAt: opResult.status === "sent" ? new Date() : null,
        customerNotifiedAt: cuResult.status === "sent" ? new Date() : null,
        notificationError: errors.length ? errors.join("; ").slice(0, 1000) : null,
      },
    });
  } catch (e) {
    console.error("[booking] Benachrichtigungsstatus konnte nicht gespeichert werden:", e instanceof Error ? e.message : e);
  }

  const mailFlag = cuResult.status === "sent" ? "1" : "0";

  // Stripe Checkout (Kartendaten werden ausschließlich bei Stripe verarbeitet)
  if (payable) {
    try {
      const ref = booking.reference;
      const session = await stripe().checkout.sessions.create(
        {
          mode: "payment",
          locale: "de",
          customer_email: data.email,
          client_reference_id: booking.id,
          metadata: { bookingId: booking.id, reference: ref },
          payment_intent_data: { metadata: { bookingId: booking.id, reference: ref }, description: `DEENO Chauffeurfahrt ${ref}` },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "eur",
                unit_amount: toCents(payable.amount),
                product_data: {
                  name: `Chauffeurfahrt ${ref} – ${tripTypeLabels[data.tripType]}`,
                  description: `${vehicleLabel(data.vehicleClass)} · ${formatDateDe(data.pickupDate)}, ${data.pickupTime} Uhr · ${data.pickupAddress}${data.dropoffAddress ? ` → ${data.dropoffAddress}` : ""}`.slice(0, 480),
                },
              },
            },
          ],
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
          success_url: `${siteUrl}/anfrage/eingegangen?nr=${ref}&m=${mailFlag}&zahlung=erfolgreich`,
          cancel_url: `${siteUrl}/anfrage/eingegangen?nr=${ref}&m=${mailFlag}&zahlung=abgebrochen`,
        },
        { idempotencyKey: `checkout-${booking.id}` },
      );
      await db().bookingRequest.update({ where: { id: booking.id }, data: { stripeCheckoutSessionId: session.id } });
      if (session.url) return NextResponse.json({ ok: true, reference: ref, customerMail: cuResult.status === "sent" ? "sent" : "not_sent", checkoutUrl: session.url });
    } catch (e) {
      console.error("[booking] Stripe Checkout fehlgeschlagen:", e instanceof Error ? e.message : e);
      await db().bookingRequest.update({ where: { id: booking.id }, data: { paymentStatus: "FAILED" } }).catch(() => {});
      return NextResponse.json({ ok: true, reference: booking.reference, customerMail: cuResult.status === "sent" ? "sent" : "not_sent", paymentError: true });
    }
  }

  return NextResponse.json({
    ok: true,
    reference: booking.reference,
    // Nur "sent", wenn die E-Mail tatsächlich an den Dienst übergeben wurde
    customerMail: cuResult.status === "sent" ? "sent" : "not_sent",
  });
}
