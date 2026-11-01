"use client";

import { useBookingDialog } from "@/components/booking/booking-dialog";
import { ArrowRightIcon } from "@/components/icons";
import type { VehicleSlug } from "@/config/fleet";

/** Öffnet das Buchungsfenster mit vorausgewähltem Fahrzeug. */
export function BookVehicleButton({ slug, model }: { slug: VehicleSlug; model: string }) {
  const { open } = useBookingDialog();
  return (
    <button
      type="button"
      onClick={() => open({ vehicleClass: slug })}
      aria-label={`${model} – Jetzt Fahrt buchen`}
      className="btn btn-ghost min-h-12 border-gold/40 px-6 text-[0.68rem] hover:bg-gold hover:text-ink"
    >
      Jetzt Fahrt buchen <ArrowRightIcon size={16} />
    </button>
  );
}
