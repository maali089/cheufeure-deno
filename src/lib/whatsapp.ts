import { whatsappNumber } from "@/config/company";
import { vehicleLabel } from "@/config/fleet";
import { formatDateDe } from "./datetime";
import { tripTypeLabels, type TripTypeValue } from "./validation";

export const defaultWhatsappMessage =
  "Guten Tag, ich interessiere mich für Ihren Chauffeur- und Limousinenservice und möchte gerne eine Fahrt anfragen.";

export function whatsappHref(message: string = defaultWhatsappMessage): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export interface WhatsappTrip {
  tripType?: TripTypeValue;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupDate?: string;
  pickupTime?: string;
  passengers?: number;
  luggage?: number;
  vehicleClass?: string;
  durationHours?: number;
  returnDate?: string;
  returnTime?: string;
}

/**
 * Bereitet eine ausführlichere WhatsApp-Nachricht mit Fahrtdaten vor.
 * Enthält bewusst KEINE Kontaktdaten (E-Mail/Telefon). Versendet wird erst,
 * wenn der Kunde in WhatsApp selbst auf „Senden“ tippt.
 */
export function whatsappTripMessage(t: WhatsappTrip): string {
  const lines = ["Guten Tag, ich möchte gerne folgende Fahrt anfragen:"];
  if (t.tripType) lines.push(`• Fahrtart: ${tripTypeLabels[t.tripType]}`);
  if (t.pickupAddress) lines.push(`• Abholung: ${t.pickupAddress}`);
  if (t.dropoffAddress) lines.push(`• Ziel: ${t.dropoffAddress}`);
  if (t.pickupDate) lines.push(`• Datum: ${formatDateDe(t.pickupDate)}${t.pickupTime ? `, ${t.pickupTime} Uhr` : ""}`);
  if (t.tripType === "ROUND_TRIP" && t.returnDate) lines.push(`• Rückfahrt: ${formatDateDe(t.returnDate)}${t.returnTime ? `, ${t.returnTime} Uhr` : ""}`);
  if (t.tripType === "HOURLY" && t.durationHours) lines.push(`• Dauer: ${t.durationHours} Std.`);
  if (t.passengers) lines.push(`• Personen: ${t.passengers}`);
  if (t.luggage !== undefined) lines.push(`• Gepäck: ${t.luggage}`);
  if (t.vehicleClass) lines.push(`• Fahrzeug: ${vehicleLabel(t.vehicleClass)}`);
  lines.push("", "Vielen Dank!");
  return lines.join("\n");
}
