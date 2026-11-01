import type { StaticImageData } from "next/image";
import type { VehicleSlug } from "@/config/fleet";
import fleetE from "@/assets/images/fleet-e.jpg";
import fleetS from "@/assets/images/fleet-s.jpg";
import fleetV from "@/assets/images/fleet-v.jpg";
import fleetA8 from "@/assets/images/fleet-a8.jpg";
import fleetBmw7 from "@/assets/images/fleet-bmw7.jpg";

export const vehicleImages: Record<VehicleSlug, StaticImageData> = {
  business: fleetE,
  first: fleetS,
  van: fleetV,
  bmw7: fleetBmw7,
  audia8: fleetA8,
};
