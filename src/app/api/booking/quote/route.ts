import { NextResponse } from "next/server";
import { getFleetWithSettings } from "@/lib/server/fleet-settings";
import { offersForTrip } from "@/lib/server/payments";
import { rateLimit } from "@/lib/server/rate-limit";
import { PayloadError, clientIp, isSameOrigin, jsonError, readJson } from "@/lib/server/request-guard";
import { flattenIssues, tripStepSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Serverseitige Preis-/Angebotsauskunft je Fahrzeugklasse.
 * Ohne bestätigte Preisregeln: { kind: "on_request" } für alle Klassen, keine Zahlung.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "Ungültige Herkunft der Anfrage.");
  if (!rateLimit(`quote:${clientIp(req)}`, 30, 60 * 1000).ok) return jsonError(429, "Zu viele Anfragen.");
  let body: unknown;
  try {
    body = await readJson(req, 12_000);
  } catch (e) {
    return jsonError(400, e instanceof PayloadError ? e.message : "Ungültige Anfrage.");
  }
  const parsed = tripStepSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "Bitte prüfen Sie Ihre Fahrtdaten.", flattenIssues(parsed.error));
  const t = parsed.data;
  const fleet = await getFleetWithSettings();
  const { offers } = await offersForTrip(
    {
      tripType: t.tripType,
      pickupAddress: t.pickupAddress,
      pickupPlaceId: t.pickupPlaceId,
      dropoffAddress: t.dropoffAddress,
      dropoffPlaceId: t.dropoffPlaceId,
      stops: t.stops.map((s) => s.address).filter(Boolean),
      durationHours: t.tripType === "HOURLY" ? t.durationHours : undefined,
      pickupDate: t.pickupDate,
      pickupTime: t.pickupTime,
    },
    fleet,
    t.passengers,
    t.luggage,
  );
  return NextResponse.json({
    ok: true,
    offers: offers.map((o) => ({
      slug: o.slug,
      payable: o.payable,
      price: o.quote.kind === "fixed" ? { amount: o.quote.amount, currency: o.quote.currency } : null,
    })),
  });
}
