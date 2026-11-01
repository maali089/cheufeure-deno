import { BookingForm } from "@/components/booking/booking-form";
import { toBookingVehicles } from "@/components/booking/to-vehicles";
import { SectionHeading } from "@/components/ui/section-heading";
import type { FleetEntry } from "@/lib/server/fleet-settings";

export function Booking({ fleet, placesEnabled }: { fleet: FleetEntry[]; placesEnabled: boolean }) {
  const vehicles = toBookingVehicles(fleet);

  return (
    <section id="buchen" aria-labelledby="buchen-title" className="relative scroll-mt-20 py-28 md:py-40">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="container-lux">
        <SectionHeading
          id="buchen-title"
          eyebrow="Fahrt buchen"
          title={
            <>
              Ihre Anfrage in <em className="font-light italic text-gold">vier Schritten.</em>
            </>
          }
          intro="Teilen Sie uns Ihre Fahrtwünsche mit. Wir prüfen die Verfügbarkeit und melden uns mit einem individuellen Angebot zur Bestätigung Ihrer Fahrt."
        />
        <div className="mt-16 border border-white/[0.07] bg-graphite/60 p-5 sm:p-8 md:mt-20 md:p-12">
          <BookingForm vehicles={vehicles} placesEnabled={placesEnabled} />
        </div>
      </div>
    </section>
  );
}
