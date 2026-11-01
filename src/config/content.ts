import { company } from "./company";

export const navigation = [
  { label: "Startseite", href: "/#start", id: "start" },
  { label: "Leistungen", href: "/#leistungen", id: "leistungen" },
  { label: "Fahrzeugflotte", href: "/#flotte", id: "flotte" },
  { label: "Über uns", href: "/#ueber-uns", id: "ueber-uns" },
  { label: "Fahrt buchen", href: "/#buchen", id: "buchen" },
  { label: "Kontakt", href: "/#kontakt", id: "kontakt" },
] as const;

export type ServiceKey = "airport" | "business" | "vip" | "event" | "hourly";

export interface Service {
  key: ServiceKey;
  title: string;
  description: string;
  imageAlt: string;
  /** Vorauswahl der Fahrtart im Buchungsformular */
  tripType: "ONE_WAY" | "ROUND_TRIP" | "AIRPORT" | "HOURLY";
}

export const services: Service[] = [
  {
    key: "airport",
    title: "Flughafentransfer",
    description: "Komfortable Fahrten zum oder vom Flughafen mit individuell abgestimmter Abholung.",
    imageAlt: "Landendes Flugzeug über beleuchteter Landebahn in der Abenddämmerung",
    tripType: "AIRPORT",
  },
  {
    key: "business",
    title: "Business- und Executive-Fahrten",
    description: "Professioneller Chauffeur-Service für geschäftliche Termine und anspruchsvolle Reisende.",
    imageAlt: "Geschäftsmann arbeitet während der Fahrt am Laptop im Fond eines Fahrzeugs",
    tripType: "ONE_WAY",
  },
  {
    key: "vip",
    title: "VIP- und Limousinenservice",
    description: "Exklusive Beförderung mit besonderem Fokus auf Komfort, Privatsphäre und Diskretion.",
    imageAlt: "Dunkle Ledersitze im Fond einer Limousine, durch das Seitenfenster fotografiert",
    tripType: "ONE_WAY",
  },
  {
    key: "event",
    title: "Event- und Hochzeitsfahrten",
    description: "Stilvolle Fahrten für besondere Veranstaltungen und unvergessliche Anlässe.",
    imageAlt: "Brautstrauß aus weißen Rosen im Innenraum eines Fahrzeugs",
    tripType: "ROUND_TRIP",
  },
  {
    key: "hourly",
    title: "Individuelle Stundenbuchung",
    description: "Flexible Chauffeurleistungen für mehrere Termine oder persönliche Tagesplanungen.",
    imageAlt: "Elegante, beleuchtete Hoteleinfahrt bei Nacht mit wartendem Fahrzeug",
    tripType: "HOURLY",
  },
];

export const advantages = [
  { key: "discretion", title: "Diskretion", text: "Eine angenehme und private Reiseatmosphäre." },
  { key: "comfort", title: "Komfort", text: "Ein Reiseerlebnis mit besonderem Augenmerk auf Bequemlichkeit." },
  { key: "personal", title: "Persönlicher Service", text: "Individuelle Planung abgestimmt auf die Wünsche des Kunden." },
  { key: "flexible", title: "Flexible Fahrten", text: "Passende Anfragen für unterschiedliche Anlässe und Bedürfnisse." },
] as const;

/** Antworten bewusst ohne erfundene Preise, Fristen oder Vertragsbedingungen. */
export const faqs = [
  {
    q: "Wie kann ich eine Fahrt anfragen?",
    a: "Am einfachsten über unser Buchungsformular auf dieser Seite: Fahrtdaten eingeben, Fahrzeugklasse wählen, Kontaktdaten ergänzen und die Anfrage absenden. Alternativ erreichen Sie uns telefonisch, per E-Mail oder über WhatsApp.",
  },
  {
    q: "Wann erhalte ich meine Buchungsbestätigung?",
    a: "Nach dem Absenden erhalten Sie eine Anfragenummer. Ihre Anfrage wird anschließend persönlich geprüft – die Fahrt gilt erst als gebucht, wenn wir sie Ihnen ausdrücklich bestätigt haben. Wir melden uns so bald wie möglich bei Ihnen.",
  },
  {
    q: "Kann ich einen Flughafentransfer anfragen?",
    a: "Ja. Wählen Sie im Formular die Fahrtart „Flughafentransfer“ und geben Sie, wenn vorhanden, Ihre Flugnummer an. So kann die Abholung bestmöglich auf Ihre Reise abgestimmt werden.",
  },
  {
    q: "Sind individuelle Zwischenstopps möglich?",
    a: "Sie können im Buchungsformular bis zu fünf Zwischenstopps angeben. Ob und wie diese umgesetzt werden können, klären wir mit Ihnen im Rahmen der Bestätigung.",
  },
  {
    q: "Wie funktioniert eine Stundenbuchung?",
    a: "Bei der Stundenbuchung geben Sie Startadresse, Datum, Uhrzeit und die gewünschte Dauer an. Das Ziel ist optional. Die Details Ihrer Tagesplanung besprechen wir anschließend persönlich mit Ihnen.",
  },
  {
    q: "Kann ich meine Buchungsanfrage ändern?",
    a: "Ja. Melden Sie sich einfach telefonisch, per E-Mail oder WhatsApp und nennen Sie Ihre Anfragenummer. Wir berücksichtigen Ihre Änderungen bei der weiteren Bearbeitung.",
  },
  {
    q: "Welche Zahlungsmöglichkeiten stehen zur Verfügung?",
    a: "Über die Website erfolgt keine Zahlung. Preise und Zahlungsmöglichkeiten werden Ihnen mit Ihrem individuellen Angebot mitgeteilt.",
  },
  {
    q: "Wie kann ich DEENO kontaktieren?",
    a: `Telefonisch unter ${company.phone.display}, per E-Mail an ${company.email}, über WhatsApp oder über das Kontaktformular auf dieser Seite.`,
  },
] as const;
