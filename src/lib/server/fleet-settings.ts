import "server-only";
import { fleet, type Vehicle } from "@/config/fleet";
import { db, isDatabaseConfigured } from "./db";

export interface FleetEntry extends Vehicle {
  enabled: boolean;
  confirmed: boolean;
  note?: string | null;
}

/** Flotte inkl. administrierter Verfügbarkeit. Fällt ohne Datenbank auf Standardwerte zurück. */
export async function getFleetWithSettings(): Promise<FleetEntry[]> {
  let settings: { slug: string; enabled: boolean; confirmed: boolean; note: string | null }[] = [];
  if (isDatabaseConfigured()) {
    try {
      settings = await db().fleetSetting.findMany();
    } catch (e) {
      console.error("[fleet] Einstellungen konnten nicht geladen werden:", e instanceof Error ? e.message : e);
    }
  }
  return fleet.map((v) => {
    const s = settings.find((x) => x.slug === v.slug);
    return { ...v, enabled: s?.enabled ?? true, confirmed: s?.confirmed ?? false, note: s?.note };
  });
}
