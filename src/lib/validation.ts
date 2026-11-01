import { z } from "zod";
import { fleet, vehicleSlugs } from "@/config/fleet";
import { berlinNow, isValidIsoDate, isValidTime } from "./datetime";

/* ───────────── Labels ───────────── */

export const tripTypes = ["ONE_WAY", "ROUND_TRIP", "AIRPORT", "HOURLY"] as const;
export type TripTypeValue = (typeof tripTypes)[number];

export const tripTypeLabels: Record<TripTypeValue, string> = {
  ONE_WAY: "Einzelfahrt",
  ROUND_TRIP: "Hin- und Rückfahrt",
  AIRPORT: "Flughafentransfer",
  HOURLY: "Stundenbuchung",
};

export const bookingStatuses = ["RECEIVED", "IN_PROGRESS", "CONFIRMED", "REJECTED", "COMPLETED"] as const;
export type BookingStatusValue = (typeof bookingStatuses)[number];

export const bookingStatusLabels: Record<BookingStatusValue, string> = {
  RECEIVED: "Eingegangen",
  IN_PROGRESS: "In Bearbeitung",
  CONFIRMED: "Bestätigt",
  REJECTED: "Abgelehnt",
  COMPLETED: "Abgeschlossen",
};

export const contactSubjects = [
  "Allgemeine Anfrage",
  "Buchungsanfrage",
  "Firmenkunden",
  "Individuelles Angebot",
  "Sonstiges",
] as const;

export const MAX_STOPS = 5;
export const MAX_PASSENGERS = Math.max(...fleet.map((v) => v.passengers));
export const MAX_LUGGAGE = 10;
export const MAX_HOURS = 24;

/* ───────────── Bausteine ───────────── */

const req = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} ist erforderlich.` })
    .trim()
    .min(min, min <= 1 ? `${label} ist erforderlich.` : `${label} ist zu kurz.`)
    .max(max, `${label} ist zu lang (max. ${max} Zeichen).`);

const opt = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} ist zu lang (max. ${max} Zeichen).`)
    .optional()
    .transform((v) => (v ? v : undefined));

const phoneRegex = /^\+?[0-9 ()/.-]{6,30}$/;
const flightRegex = /^[A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?$/i;

/* ───────────── Buchungsanfrage ───────────── */

export const tripSchema = z.object({
  tripType: z.enum(tripTypes, { error: "Bitte wählen Sie eine Fahrtart." }),
  pickupAddress: req("Abholadresse", 3, 200),
  pickupPlaceId: opt("Ort", 300),
  dropoffAddress: opt("Zieladresse", 200),
  dropoffPlaceId: opt("Ort", 300),
  stops: z
    .array(z.object({ address: z.string().trim().max(200, "Adresse ist zu lang.") }))
    .max(MAX_STOPS, `Maximal ${MAX_STOPS} Zwischenstopps.`)
    .default([]),
  pickupDate: z.string().trim().min(1, "Bitte wählen Sie ein Datum."),
  pickupTime: z.string().trim().min(1, "Bitte wählen Sie eine Uhrzeit."),
  returnDate: opt("Rückfahrtdatum", 10),
  returnTime: opt("Rückfahrtszeit", 5),
  durationHours: z.coerce.number().int().optional(),
  passengers: z.coerce
    .number({ error: "Bitte geben Sie die Personenanzahl an." })
    .int()
    .min(1, "Mindestens 1 Person.")
    .max(MAX_PASSENGERS, `Für mehr als ${MAX_PASSENGERS} Personen kontaktieren Sie uns bitte direkt.`),
  luggage: z.coerce.number().int().min(0, "Ungültige Anzahl.").max(MAX_LUGGAGE, `Für mehr als ${MAX_LUGGAGE} Gepäckstücke kontaktieren Sie uns bitte direkt.`),
  flightNumber: opt("Flugnummer", 10).refine((v) => !v || flightRegex.test(v), "Bitte eine gültige Flugnummer angeben, z. B. LH 2034."),
  tripNotes: opt("Hinweise", 1000),
});

type TripInput = z.output<typeof tripSchema>;

function tripRules(d: TripInput, ctx: z.RefinementCtx) {
  if (d.tripType !== "HOURLY" && (!d.dropoffAddress || d.dropoffAddress.length < 3)) {
    ctx.addIssue({ code: "custom", path: ["dropoffAddress"], message: "Bitte geben Sie eine Zieladresse an." });
  }

  const dateOk = isValidIsoDate(d.pickupDate);
  const timeOk = isValidTime(d.pickupTime);
  if (!dateOk) ctx.addIssue({ code: "custom", path: ["pickupDate"], message: "Bitte ein gültiges Datum wählen." });
  if (!timeOk) ctx.addIssue({ code: "custom", path: ["pickupTime"], message: "Bitte eine gültige Uhrzeit wählen." });

  const now = berlinNow();
  const pickup = `${d.pickupDate}T${d.pickupTime}`;
  if (dateOk && timeOk && pickup <= `${now.date}T${now.time}`) {
    ctx.addIssue({ code: "custom", path: ["pickupTime"], message: "Der Abholzeitpunkt muss in der Zukunft liegen." });
  }
  if (dateOk && d.pickupDate > now.plusYears(2)) {
    ctx.addIssue({ code: "custom", path: ["pickupDate"], message: "Anfragen sind bis zu zwei Jahre im Voraus möglich." });
  }

  if (d.tripType === "ROUND_TRIP") {
    const rdOk = !!d.returnDate && isValidIsoDate(d.returnDate);
    const rtOk = !!d.returnTime && isValidTime(d.returnTime);
    if (!rdOk) ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Bitte ein Rückfahrtdatum wählen." });
    if (!rtOk) ctx.addIssue({ code: "custom", path: ["returnTime"], message: "Bitte eine Rückfahrtszeit wählen." });
    if (rdOk && rtOk && dateOk && timeOk && `${d.returnDate}T${d.returnTime}` <= pickup) {
      ctx.addIssue({ code: "custom", path: ["returnTime"], message: "Die Rückfahrt muss nach der Hinfahrt liegen." });
    }
  }

  if (d.tripType === "HOURLY") {
    if (!d.durationHours || Number.isNaN(d.durationHours) || d.durationHours < 1 || d.durationHours > MAX_HOURS) {
      ctx.addIssue({ code: "custom", path: ["durationHours"], message: `Bitte eine Dauer zwischen 1 und ${MAX_HOURS} Stunden wählen.` });
    }
  }
}

export const vehicleSchema = z.object({
  vehicleClass: z.enum(vehicleSlugs, { error: "Bitte wählen Sie eine Fahrzeugklasse." }),
});

function vehicleRules(d: { vehicleClass: string; passengers: number; luggage: number }, ctx: z.RefinementCtx) {
  const v = fleet.find((f) => f.slug === d.vehicleClass);
  if (!v) return;
  if (d.passengers > v.passengers) {
    ctx.addIssue({ code: "custom", path: ["vehicleClass"], message: `Diese Fahrzeugklasse ist für bis zu ${v.passengers} Fahrgäste ausgelegt.` });
  } else if (d.luggage > v.luggage) {
    ctx.addIssue({ code: "custom", path: ["vehicleClass"], message: `Für ${d.luggage} Gepäckstücke empfehlen wir eine größere Fahrzeugklasse.` });
  }
}

export const customerSchema = z.object({
  firstName: req("Vorname", 1, 80),
  lastName: req("Nachname", 1, 80),
  email: z.string().trim().max(200).pipe(z.email("Bitte eine gültige E-Mail-Adresse angeben.")),
  phone: z.string().trim().regex(phoneRegex, "Bitte eine gültige Telefonnummer angeben."),
  company: opt("Firmenname", 120),
  specialRequests: opt("Besondere Wünsche", 1000),
  privacy: z.literal(true, { error: "Bitte bestätigen Sie die Datenschutzhinweise." }),
});

/** Zusätzliche Spam-Schutz-Felder (werden nicht gespeichert). */
export const antiSpamSchema = z.object({
  website: z.string().max(200).optional(), // Honeypot – muss leer bleiben
  startedAt: z.coerce.number().int().positive(),
});

export const tripStepSchema = tripSchema.superRefine(tripRules);
export const vehicleStepSchema = z
  .object({ ...vehicleSchema.shape, passengers: tripSchema.shape.passengers, luggage: tripSchema.shape.luggage })
  .superRefine(vehicleRules);
export const customerStepSchema = customerSchema;

export const bookingSchema = z
  .object({ ...tripSchema.shape, ...vehicleSchema.shape, ...customerSchema.shape, ...antiSpamSchema.shape })
  .superRefine((d, ctx) => {
    tripRules(d, ctx);
    vehicleRules(d, ctx);
  });

export type BookingInput = z.input<typeof bookingSchema>;
export type BookingData = z.output<typeof bookingSchema>;

/* ───────────── Kontakt ───────────── */

export const contactSchema = z.object({
  name: req("Name", 2, 120),
  email: z.string().trim().max(200).pipe(z.email("Bitte eine gültige E-Mail-Adresse angeben.")),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || phoneRegex.test(v), "Bitte eine gültige Telefonnummer angeben."),
  subject: z.enum(contactSubjects, { error: "Bitte wählen Sie einen Betreff." }),
  message: req("Nachricht", 10, 4000),
  privacy: z.literal(true, { error: "Bitte bestätigen Sie die Datenschutzhinweise." }),
  ...antiSpamSchema.shape,
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.output<typeof contactSchema>;

/** Zod-Fehler in ein flaches Feld→Meldung-Objekt umwandeln. */
export function flattenIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
