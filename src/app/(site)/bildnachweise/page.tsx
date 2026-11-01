import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal";

export const metadata: Metadata = {
  title: "Bildnachweise",
  alternates: { canonical: "/bildnachweise" },
  robots: { index: false, follow: true },
};

type Credit = { use: string; author: string; url: string; source?: string; license?: { name: string; url: string } };

const credits: Credit[] = [
  { use: "Startseite (Hero) – S-Klasse bei Nacht", author: "Mark Tryapichnikov", url: "https://unsplash.com/photos/MllJgoAFTcE" },
  { use: "Flotte – First Class (Symbolbild)", author: "Dekler Ph", url: "https://unsplash.com/photos/ZmcOEbW3hDg" },
  {
    use: "Flotte – Business Class: Mercedes-Benz E-Klasse W214 (Symbolbild)",
    author: "Chanokchon",
    source: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:2024_Mercedes-Benz_E-Class_E350e_AMG_Dynamic.jpg",
    license: { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/deed.de" },
  },
  {
    use: "Flotte – Business Van: Mercedes-Benz V-Klasse (Symbolbild)",
    author: "M 93",
    source: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:Mercedes-Benz_V_300_d_4MATIC_Exklusive_Lang_(V_447,_2._Facelift)_%E2%80%93_f_05072025.jpg",
    license: { name: "CC BY-SA 3.0 DE", url: "https://creativecommons.org/licenses/by-sa/3.0/de/" },
  },
  {
    use: "Flotte – BMW 7er G70 (Symbolbild)",
    author: "Damian B Oh",
    source: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:BMW_G70_740i_sDrive_M_Sport_Black_Sapphire_Metallic_(3-crop).jpg",
    license: { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/deed.de" },
  },
  {
    use: "Flotte – Audi A8 L D5 Facelift (Symbolbild)",
    author: "Ethan Llamas",
    source: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:Audi_A8_L_D5_FL_quattro_Mythos_Black_Metallic_01.jpg",
    license: { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/deed.de" },
  },
  { use: "Leistung – Flughafentransfer", author: "Amsterdam City Archives", url: "https://unsplash.com/photos/WpKZL_8CtRU" },
  { use: "Leistung – Business-Fahrten", author: "Vitaly Gariev", url: "https://unsplash.com/photos/gBtplDUad4U" },
  { use: "Leistung – VIP-Service", author: "Ansis Kančs", url: "https://unsplash.com/photos/On4IsBKcwDA" },
  { use: "Leistung – Event- und Hochzeitsfahrten", author: "Leongsan", url: "https://unsplash.com/photos/CuR-fS2oKw4" },
  { use: "Leistung – Stundenbuchung", author: "Josh Marty", url: "https://unsplash.com/photos/8iDVTjCL94c" },
  {
    use: "Über uns: Mercedes-Benz V-Klasse (Symbolbild)",
    author: "Alexander Migl",
    source: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:Mercedes-Benz_V-Class_(W447,_2023)_DSC_7977.jpg",
    license: { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/deed.de" },
  },
];

export default function BildnachweisePage() {
  return (
    <LegalPage eyebrow="Rechtliches" title="Bildnachweise">
      <LegalSection title="Fotografien">
        <p>
          Die Fotografien stammen von Unsplash (genutzt gemäß der{" "}
          <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
            Unsplash-Lizenz
          </a>
          ) bzw. von Wikimedia Commons (Creative-Commons-Lizenzen, siehe jeweilige Angabe). Alle Bilder wurden bearbeitet: Farbkorrektur, abgedunkelter
          Hintergrund, unkenntlich gemachte Kfz-Kennzeichen. Die bearbeiteten Fassungen der CC-BY-SA-Bilder stehen unter derselben Lizenz. Fahrzeugfotos sind
          Symbolbilder und zeigen nicht zwingend Fahrzeuge von DEENO.
        </p>
        <ul className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {credits.map((c) => (
            <li key={c.url} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-ivory">{c.use}</span>
              <span className="text-sm">
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                  Foto: {c.author} / {c.source ?? "Unsplash"}
                </a>
                {c.license && (
                  <>
                    {" · "}
                    <a href={c.license.url} target="_blank" rel="noopener noreferrer" className="text-mist hover:text-gold hover:underline">
                      {c.license.name}
                    </a>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </LegalSection>
      <LegalSection title="Illustrationen">
        <p>
          Die animierte Darstellung der Chauffeurfahrt ist eine eigens für diese Website erstellte Vektorgrafik einer Mercedes-Benz S-Klasse (W223); die
          Proportionen wurden anhand einer Seitenansicht vermessen. Die Grafik enthält keine Markenlogos und keine fremden Bildbestandteile.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
