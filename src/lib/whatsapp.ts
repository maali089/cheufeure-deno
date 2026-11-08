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

/* ───────────── Betreiber → Fahrgast ───────────── */

/**
 * Telefonnummer des Fahrgasts in das Format für wa.me umwandeln (nur Ziffern, mit Ländervorwahl).
 * Deutsche Nummern ohne Vorwahl (0170 …) erhalten +49. Gibt null zurück, wenn die Nummer unplausibel ist.
 */
export function phoneToWhatsapp(phone: string): string | null {
  let p = phone.replace(/\(0\)/g, "").replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  else if (p.startsWith("0")) p = `+49${p.slice(1)}`;
  else if (!p.startsWith("+")) p = `+${p}`;
  const digits = p.slice(1).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  return digits;
}

export interface WhatsappBooking {
  reference: string;
  firstName: string;
  lastName: string;
  tripType: TripTypeValue;
  pickupAddress: string;
  dropoffAddress: string | null;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string | null;
  returnTime?: string | null;
  durationHours?: number | null;
  passengers: number;
  vehicleClass: string;
}

function bookingLines(b: WhatsappBooking) {
  const lines = [
    `Auftragsnummer: ${b.reference}`,
    `Fahrtart: ${tripTypeLabels[b.tripType]}`,
    `Datum: ${formatDateDe(b.pickupDate)}, ${b.pickupTime} Uhr`,
    `Abholung: ${b.pickupAddress}`,
  ];
  if (b.dropoffAddress) lines.push(`Ziel: ${b.dropoffAddress}`);
  if (b.tripType === "ROUND_TRIP" && b.returnDate) lines.push(`Rückfahrt: ${formatDateDe(b.returnDate)}${b.returnTime ? `, ${b.returnTime} Uhr` : ""}`);
  if (b.tripType === "HOURLY" && b.durationHours) lines.push(`Dauer: ${b.durationHours} Std.`);
  lines.push(`Fahrzeug: ${vehicleLabel(b.vehicleClass)}`, `Personen: ${b.passengers}`);
  return lines;
}

/** Erste Nachricht des Betreibers zur Preisabsprache. */
export function operatorOfferMessage(b: WhatsappBooking): string {
  return [
    `Guten Tag ${b.firstName} ${b.lastName},`,
    "",
    "vielen Dank für Ihre Anfrage bei DEENO Chauffeurservice:",
    ...bookingLines(b),
    "",
    "Gerne nennen wir Ihnen hier den Fahrpreis für diese Fahrt.",
  ].join("\n");
}

/** Bestätigung nach erfolgter Preisabsprache. */
export function operatorConfirmationMessage(b: WhatsappBooking, priceText: string): string {
  return [
    `Guten Tag ${b.firstName} ${b.lastName},`,
    "",
    "hiermit bestätigen wir Ihre Fahrt:",
    ...bookingLines(b),
    `Vereinbarter Fahrpreis: ${priceText}`,
    "",
    "Wir freuen uns auf Sie. DEENO Chauffeurservice",
  ].join("\n");
}

/** Link öffnet WhatsApp mit vorbereitetem Text – gesendet wird erst, wenn der Betreiber selbst auf „Senden“ tippt. */
export const whatsappChatHref = (waNumber: string, message: string) => `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
