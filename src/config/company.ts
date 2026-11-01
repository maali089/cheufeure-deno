/**
 * Offizielle Unternehmensdaten – einzige Quelle für Impressum, Footer, Kontakt,
 * E-Mail-Vorlagen und strukturierte Daten. Keine weiteren Angaben erfinden.
 */
export const company = {
  brand: "DEENO",
  brandLine: "Chauffeur- & Limousinenservice",
  legalName: "Deeno Chauffeur- und Limousinenservice",
  owner: "Wajdi Deeno",
  address: {
    street: "Ganghoferstr. 29",
    postalCode: "82216",
    city: "Maisach",
    country: "Deutschland",
    countryCode: "DE",
  },
  email: "Firmawajdideeno@yahoo.com",
  phone: {
    display: "0160 7703472",
    international: "+49 160 7703472",
    e164: "+491607703472",
  },
  /**
   * Einsatzgebiet – ZU BESTÄTIGEN durch DEENO. Aktuell nur aus Geschäftssitz und
   * den vorgegebenen Suchbegriffen abgeleitet.
   */
  serviceArea: ["Maisach", "München", "Flughafen München"],
} as const;

export const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "491607703472").replace(/\D/g, "");

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

/**
 * Suchmaschinen-Indexierung erst nach Freigabe (Impressum/Datenschutz fertig):
 * in Vercel SITE_INDEXING="true" setzen. Bis dahin noindex + robots.txt „Disallow: /“.
 */
export const siteIndexable = process.env.SITE_INDEXING === "true";

export const telHref = `tel:${company.phone.e164}`;
export const mailHref = `mailto:${company.email}`;
