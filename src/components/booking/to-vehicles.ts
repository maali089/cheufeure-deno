import type { FleetEntry } from "@/lib/server/fleet-settings";
import type { BookingVehicle } from "./booking-form";

export const toBookingVehicles = (fleet: FleetEntry[]): BookingVehicle[] =>
  fleet.map((v) => ({
    slug: v.slug,
    model: v.model,
    category: v.category,
    passengers: v.passengers,
    luggage: v.luggage,
    features: v.features,
    imageAlt: v.imageAlt,
    imageNote: v.imageNote,
    imagePosition: v.imagePosition,
    enabled: v.enabled,
    confirmed: v.confirmed,
  }));
