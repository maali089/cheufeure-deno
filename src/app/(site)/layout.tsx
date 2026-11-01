import { BookingDialogProvider } from "@/components/booking/booking-dialog";
import { toBookingVehicles } from "@/components/booking/to-vehicles";
import { ContactDock } from "@/components/layout/contact-dock";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { getFleetWithSettings } from "@/lib/server/fleet-settings";
import { isPlacesConfigured } from "@/lib/server/maps";

export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const vehicles = toBookingVehicles(await getFleetWithSettings());
  return (
    <BookingDialogProvider vehicles={vehicles} placesEnabled={isPlacesConfigured()}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-gold focus:px-4 focus:py-3 focus:text-ink">
        Zum Inhalt springen
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <ContactDock />
    </BookingDialogProvider>
  );
}
