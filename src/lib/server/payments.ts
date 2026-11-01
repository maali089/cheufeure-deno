import "server-only";
import Stripe from "stripe";
import { z } from "zod";
import type { VehicleSlug } from "@/config/fleet";
import { berlinNow } from "@/lib/datetime";
import { quote, type PricingRules, type Quote } from "@/lib/pricing";
import type { TripTypeValue } from "@/lib/validation";
import type { FleetEntry } from "./fleet-settings";
import { computeRoute } from "./maps";

/**
 * Online-Zahlung über Stripe Checkout.
 *
 * Eine Zahlung wird NUR angeboten, wenn ALLE Voraussetzungen erfüllt sind:
 *  1. Stripe ist konfiguriert (STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET)
 *  2. DEENO hat verbindliche Sofortbuchungen freigegeben (INSTANT_BOOKING_ENABLED=true)
 *  3. Es gibt bestätigte Preisregeln (PRICING_RULES_JSON) und daraus einen echten Preis
 *     (bei Strecken nur mit echter Routenberechnung – keine Schätzwerte)
 *  4. Die Fahrzeugklasse ist im Adminbereich als „bestätigt“ markiert
 *  5. Die Fahrt liegt ausreichend in der Zukunft (MIN_LEAD_HOURS, Standard 24)
 * Andernfalls endet das Buchungsfenster mit „Unverbindliches Angebot anfordern“.
 * Der Preis wird ausschließlich serverseitig berechnet.
 */

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY fehlt.");
  stripeClient ??= new Stripe(key);
  return stripeClient;
}

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
export const isInstantBookingEnabled = () => process.env.INSTANT_BOOKING_ENABLED === "true";

const vehicleRule = z.object({ baseFare: z.number().nonnegative(), perKm: z.number().nonnegative(), perMinute: z.number().nonnegative(), hourlyRate: z.number().nonnegative(), minimumFare: z.number().nonnegative() });
const rulesSchema = z.object({
  version: z.string().min(1),
  currency: z.literal("EUR"),
  perVehicle: z.object({ business: vehicleRule, first: vehicleRule, van: vehicleRule, bmw7: vehicleRule, audia8: vehicleRule }).partial(),
  airportSurcharge: z.number().nonnegative(),
  perStop: z.number().nonnegative(),
  extras: z.record(z.string(), z.number().nonnegative()).default({}),
});

let cachedRules: { raw: string; rules: PricingRules | null } | null = null;
/** Bestätigte Preisregeln aus PRICING_RULES_JSON (oder null, solange keine vorliegen). */
export function pricingRules(): PricingRules | null {
  const raw = process.env.PRICING_RULES_JSON ?? "";
  if (cachedRules?.raw === raw) return cachedRules.rules;
  let rules: PricingRules | null = null;
  if (raw.trim()) {
    try {
      rules = rulesSchema.parse(JSON.parse(raw)) as PricingRules;
    } catch (e) {
      console.error("[pricing] PRICING_RULES_JSON ist ungültig – Online-Preise deaktiviert:", e instanceof Error ? e.message : e);
    }
  }
  cachedRules = { raw, rules };
  return rules;
}

export interface TripForQuote {
  tripType: TripTypeValue;
  pickupAddress: string;
  pickupPlaceId?: string;
  dropoffAddress?: string;
  dropoffPlaceId?: string;
  stops: string[];
  durationHours?: number;
  pickupDate: string;
  pickupTime: string;
}

export interface VehicleOffer {
  slug: VehicleSlug;
  quote: Quote;
  payable: boolean;
}

function hoursUntil(date: string, time: string) {
  const now = berlinNow();
  const toMin = (d: string, t: string) => {
    const [y, m, dd] = d.split("-").map(Number) as [number, number, number];
    const [hh, mm] = t.split(":").map(Number) as [number, number];
    return Date.UTC(y, m - 1, dd, hh, mm) / 60000;
  };
  return (toMin(date, time) - toMin(now.date, now.time)) / 60;
}

/** Serverseitige Angebotsberechnung für alle Fahrzeugklassen. */
export async function offersForTrip(trip: TripForQuote, fleet: FleetEntry[], passengers: number, luggage: number): Promise<{ offers: VehicleOffer[]; route: { distanceMeters: number; durationSeconds: number } | null }> {
  const rules = pricingRules();
  let route: { distanceMeters: number; durationSeconds: number } | null = null;
  if (rules && trip.tripType !== "HOURLY" && trip.dropoffAddress) {
    route = await computeRoute(
      { address: trip.pickupAddress, placeId: trip.pickupPlaceId },
      { address: trip.dropoffAddress, placeId: trip.dropoffPlaceId },
      trip.stops.map((address) => ({ address })),
    );
  }
  const leadOk = hoursUntil(trip.pickupDate, trip.pickupTime) >= Number(process.env.MIN_LEAD_HOURS ?? 24);
  const gate = isStripeConfigured() && isInstantBookingEnabled() && leadOk;

  const offers = fleet.map((v) => {
    const q = quote(
      {
        tripType: trip.tripType,
        vehicleClass: v.slug,
        distanceMeters: route?.distanceMeters,
        durationSeconds: route?.durationSeconds,
        durationHours: trip.durationHours,
        stops: trip.stops.length,
        isAirport: trip.tripType === "AIRPORT",
      },
      rules,
    );
    const fits = passengers <= v.passengers && luggage <= v.luggage;
    return { slug: v.slug, quote: q, payable: gate && q.kind === "fixed" && v.enabled && v.confirmed && fits };
  });
  return { offers, route };
}

export const toCents = (amount: number) => Math.round(amount * 100);
