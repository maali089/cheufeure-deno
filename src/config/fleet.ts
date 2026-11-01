/**
 * Vorgeschlagene Flottenkonfiguration.
 * Stammdaten werden hier gepflegt. Ob ein Fahrzeug anfragbar ist und ob DEENO es
 * tatsächlich bestätigt hat, wird im Adminbereich (/admin/flotte) verwaltet.
 * Kapazitäten sind übliche Richtwerte der jeweiligen Fahrzeugklasse.
 */
export const vehicleSlugs = ["business", "first", "van", "bmw7", "audia8"] as const;
export type VehicleSlug = (typeof vehicleSlugs)[number];

export interface Vehicle {
  slug: VehicleSlug;
  category: string;
  model: string;
  tagline: string;
  passengers: number;
  luggage: number;
  features: string[];
  imageAlt: string;
  /** Hinweis, wenn das Foto nicht exakt das angebotene Modell zeigt */
  imageNote?: string;
  /** Urhebernennung (bei CC-lizenzierten Bildern Pflicht) */
  imageCredit?: string;
  /** Bildausschnitt (Tailwind object-position) */
  imagePosition: string;
  /** "class" = Hauptklassen (große Darstellung), "alternative" = weitere Modelle als Karte */
  group: "class" | "alternative";
}

export const fleet: Vehicle[] = [
  {
    slug: "business",
    category: "Business Class",
    model: "Mercedes-Benz E-Klasse",
    tagline: "Souverän und unaufgeregt – für Geschäftstermine und Transfers.",
    passengers: 3,
    luggage: 2,
    features: ["Klimatisierung", "Ledersitze", "Ruhiges, komfortables Fahrwerk"],
    imageAlt: "Schwarze Mercedes-Benz E-Klasse Limousine der Baureihe W214, schräg von vorne, mit leuchtenden LED-Scheinwerfern",
    imageNote: "Symbolbild",
    imageCredit: "Foto: Chanokchon, CC BY-SA 4.0 (bearb.)",
    imagePosition: "object-[62%_50%]",
    group: "class",
  },
  {
    slug: "first",
    category: "First Class",
    model: "Mercedes-Benz S-Klasse",
    tagline: "Die Referenz für Komfort, Ruhe und Diskretion im Fond.",
    passengers: 3,
    luggage: 2,
    features: ["Großzügiger Fond", "Ledersitze", "Getönte Scheiben im Fond"],
    imageAlt: "Mercedes-Benz S-Klasse Limousine der Baureihe W223 in dunkler Umgebung, Frontansicht mit Kühlergrill",
    imageNote: "Symbolbild",
    imagePosition: "object-[35%_50%]",
    group: "class",
  },
  {
    slug: "van",
    category: "Business Van",
    model: "Mercedes-Benz V-Klasse",
    tagline: "Raum für Gruppen, Familien und viel Gepäck.",
    passengers: 7,
    luggage: 6,
    features: ["Bis zu 7 Fahrgäste", "Viel Platz für Gepäck", "Bequemer Einstieg"],
    imageAlt: "Schwarze Mercedes-Benz V-Klasse der aktuellen Generation mit Chrom-Kühlergrill, schräg von vorne",
    imageNote: "Symbolbild",
    imageCredit: "Foto: M 93, CC BY-SA 3.0 DE (bearb.)",
    imagePosition: "object-[78%_50%]",
    group: "class",
  },
  {
    slug: "bmw7",
    category: "First Class",
    model: "BMW 7er",
    tagline: "Die Oberklasse-Limousine der aktuellen Generation (G70) – großzügig, leise und souverän auf langen Strecken.",
    passengers: 3,
    luggage: 2,
    features: ["Großzügiger Fond", "Ledersitze", "Ruhiger Langstreckenkomfort"],
    imageAlt: "Schwarzer BMW 7er der Baureihe G70 mit beleuchteter Kühlergrill-Kontur, schräg von vorne",
    imageNote: "Symbolbild",
    imageCredit: "Foto: Damian B Oh, CC BY-SA 4.0 (bearb.)",
    imagePosition: "object-[55%_62%]",
    group: "alternative",
  },
  {
    slug: "audia8",
    category: "First Class",
    model: "Audi A8",
    tagline: "Elegante Oberklasse-Limousine (D5) mit langem Radstand – viel Raum und Ruhe für anspruchsvolle Reisende.",
    passengers: 3,
    luggage: 2,
    features: ["Langer Radstand", "Ledersitze", "Komfortables Fahrwerk"],
    imageAlt: "Schwarzer Audi A8 L der Baureihe D5 (Facelift) mit Matrix-LED-Scheinwerfern, schräg von vorne",
    imageNote: "Symbolbild",
    imageCredit: "Foto: Ethan Llamas, CC BY-SA 4.0 (bearb.)",
    imagePosition: "object-[88%_60%]",
    group: "alternative",
  },
];

export const vehicleBySlug = (slug: string) => fleet.find((v) => v.slug === slug);

export const vehicleLabel = (slug: string) => {
  const v = vehicleBySlug(slug);
  return v ? `${v.model} (${v.category})` : slug;
};
