/**
 * Vorbereitung für eine spätere automatische Preiskalkulation.
 *
 * Solange DEENO keine bestätigten Preisregeln bereitstellt (PRICING_RULES_JSON), liefert
 * `quote()` immer `{ kind: "on_request" }` → UI zeigt „Unverbindliches Angebot anfordern“.
 * Es werden KEINE Pauschalpreise oder Rabatte erfunden.
 */
import type { TripTypeValue } from "./validation";
import type { VehicleSlug } from "@/config/fleet";

export interface PriceInput {
  tripType: TripTypeValue;
  vehicleClass: VehicleSlug;
  distanceMeters?: number;
  durationSeconds?: number;
  durationHours?: number;
  stops: number;
  isAirport: boolean;
  extras?: string[];
}

export interface PricingRules {
  version: string;
  currency: "EUR";
  /** Fahrzeuge ohne Preisregel bleiben bei „Individuelles Angebot“ */
  perVehicle: Partial<Record<VehicleSlug, { baseFare: number; perKm: number; perMinute: number; hourlyRate: number; minimumFare: number }>>;
  airportSurcharge: number;
  perStop: number;
  extras: Record<string, number>;
}

export type Quote =
  | { kind: "on_request" }
  | { kind: "fixed"; amount: number; currency: "EUR"; rulesVersion: string; breakdown: { label: string; amount: number }[] };

export function quote(input: PriceInput, rules: PricingRules | null = null): Quote {
  if (!rules) return { kind: "on_request" };
  const v = rules.perVehicle[input.vehicleClass];
  if (!v) return { kind: "on_request" };
  const breakdown: { label: string; amount: number }[] = [];

  if (input.tripType === "HOURLY") {
    if (!input.durationHours) return { kind: "on_request" };
    breakdown.push({ label: `${input.durationHours} Std.`, amount: input.durationHours * v.hourlyRate });
  } else {
    if (input.distanceMeters === undefined || input.durationSeconds === undefined) return { kind: "on_request" };
    breakdown.push({ label: "Grundpreis", amount: v.baseFare });
    breakdown.push({ label: "Strecke", amount: (input.distanceMeters / 1000) * v.perKm });
    breakdown.push({ label: "Fahrzeit", amount: (input.durationSeconds / 60) * v.perMinute });
    if (input.tripType === "ROUND_TRIP") breakdown.push({ label: "Rückfahrt", amount: breakdown.reduce((s, b) => s + b.amount, 0) });
  }
  if (input.isAirport) breakdown.push({ label: "Flughafen", amount: rules.airportSurcharge });
  if (input.stops) breakdown.push({ label: "Zwischenstopps", amount: input.stops * rules.perStop });
  for (const e of input.extras ?? []) if (rules.extras[e] !== undefined) breakdown.push({ label: e, amount: rules.extras[e]! });

  const total = Math.max(v.minimumFare, breakdown.reduce((s, b) => s + b.amount, 0));
  return { kind: "fixed", amount: Math.round(total * 100) / 100, currency: "EUR", rulesVersion: rules.version, breakdown };
}
