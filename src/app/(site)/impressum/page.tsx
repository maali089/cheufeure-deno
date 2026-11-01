import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalReview, LegalSection } from "@/components/legal";
import { company, mailHref, telHref } from "@/config/company";

export const metadata: Metadata = {
  title: "Impressum",
  description: `Impressum von ${company.legalName}, Inhaber ${company.owner}, ${company.address.postalCode} ${company.address.city}.`,
  alternates: { canonical: "/impressum" },
};

export default function ImpressumPage() {
  return (
    <LegalPage eyebrow="Rechtliches" title="Impressum">
      <LegalSection title="Angaben gemäß § 5 DDG">
        <p>
          {company.legalName}
          <br />
          Inhaber: {company.owner}
          <br />
          {company.address.street}
          <br />
          {company.address.postalCode} {company.address.city}
          <br />
          {company.address.country}
        </p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          Telefon:{" "}
          <a href={telHref} className="text-gold hover:underline">
            {company.phone.display}
          </a>
          <br />
          E-Mail:{" "}
          <a href={mailHref} className="break-all text-gold hover:underline">
            {company.email}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Umsatzsteuer">
        <LegalReview>
          Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG – falls vorhanden, hier ergänzen. Andernfalls entfällt dieser Abschnitt.
        </LegalReview>
      </LegalSection>

      <LegalSection title="Genehmigung und Aufsichtsbehörde">
        <LegalReview>
          Für die entgeltliche Personenbeförderung mit Mietwagen ist in der Regel eine Genehmigung nach dem Personenbeförderungsgesetz (PBefG) erforderlich. Bitte die
          Genehmigung sowie die zuständige Genehmigungs- bzw. Aufsichtsbehörde (Name und Anschrift) ergänzen.
        </LegalReview>
      </LegalSection>

      <LegalSection title="Register">
        <LegalReview>Falls eine Eintragung im Handelsregister besteht: Registergericht und Registernummer ergänzen. Andernfalls entfällt dieser Abschnitt.</LegalReview>
      </LegalSection>

      <LegalSection title="Verantwortlich für den Inhalt">
        <p>
          {company.owner}, {company.address.street}, {company.address.postalCode} {company.address.city}
        </p>
      </LegalSection>

      <LegalSection title="Verbraucherstreitbeilegung">
        <LegalReview>
          Erklärung zur Teilnahme an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle (§§ 36, 37 VSBG) durch DEENO festlegen und hier eintragen.
        </LegalReview>
      </LegalSection>

      <LegalSection title="Haftung für Inhalte und Links">
        <p>
          Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr
          übernehmen. Für Inhalte externer Websites, auf die verwiesen wird, sind ausschließlich deren Betreiber verantwortlich.
        </p>
      </LegalSection>

      <LegalSection title="Bildnachweise">
        <p>
          Angaben zu den verwendeten Fotografien finden Sie unter{" "}
          <Link href="/bildnachweise" className="text-gold hover:underline">
            Bildnachweise
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
