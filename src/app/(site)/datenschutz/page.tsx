import type { Metadata } from "next";
import { LegalPage, LegalReview, LegalSection } from "@/components/legal";
import { company, mailHref } from "@/config/company";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: `Informationen zur Verarbeitung personenbezogener Daten bei ${company.legalName}.`,
  alternates: { canonical: "/datenschutz" },
};

export default function DatenschutzPage() {
  return (
    <LegalPage eyebrow="Rechtliches" title="Datenschutzerklärung">
      <LegalReview>
        Diese Datenschutzerklärung beschreibt die technische Umsetzung der Website. Sie ist vor Veröffentlichung fachlich (z. B. durch eine Rechtsberatung) zu prüfen und an die
        tatsächlich eingesetzten Anbieter, Verträge und Löschfristen anzupassen.
      </LegalReview>

      <LegalSection title="1. Verantwortlicher">
        <p>
          {company.legalName}, Inhaber {company.owner}
          <br />
          {company.address.street}, {company.address.postalCode} {company.address.city}
          <br />
          E-Mail:{" "}
          <a href={mailHref} className="break-all text-gold hover:underline">
            {company.email}
          </a>{" "}
          · Telefon: {company.phone.display}
        </p>
      </LegalSection>

      <LegalSection title="2. Grundsätze">
        <p>
          Wir verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung dieser Website, zur Bearbeitung Ihrer Anfragen und zur Durchführung unserer Leistungen
          erforderlich ist. Diese Website verwendet keine Analyse- oder Werbe-Tracker und bindet keine Inhalte von Drittanbietern ein, die beim Seitenaufruf automatisch Daten an
          Dritte übertragen. Schriftarten werden lokal von unserem Server ausgeliefert.
        </p>
      </LegalSection>

      <LegalSection title="3. Hosting und Server-Logdateien">
        <p>
          Beim Aufruf der Website verarbeitet unser Hosting-Anbieter technisch notwendige Daten (z. B. IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Browsertyp), um die
          Website auszuliefern und deren Sicherheit zu gewährleisten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und stabilen
          Betrieb).
        </p>
        <LegalReview>
          Hosting-Anbieter (vorgesehen: Vercel Inc., USA) mit Anschrift, Auftragsverarbeitungsvertrag, Grundlage der Drittlandübermittlung (z. B. EU-US Data Privacy Framework bzw.
          Standardvertragsklauseln) sowie Speicherdauer der Logdateien ergänzen.
        </LegalReview>
      </LegalSection>

      <LegalSection title="4. Buchungsanfragen">
        <p>
          Wenn Sie über das Buchungsformular eine Fahrt anfragen, verarbeiten wir die von Ihnen angegebenen Daten: Fahrtdaten (Abhol- und Zieladresse, Zwischenstopps, Datum,
          Uhrzeit, Personen- und Gepäckanzahl, Fahrtart, ggf. Flugnummer und Hinweise), die gewünschte Fahrzeugklasse sowie Ihre Kontaktdaten (Name, E-Mail, Telefonnummer,
          optional Firma und besondere Wünsche). Die Daten werden in einer Datenbank gespeichert, um Ihre Anfrage zu prüfen, Ihnen ein Angebot zu unterbreiten und die Fahrt
          ggf. durchzuführen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen bzw. Vertragserfüllung).
        </p>
        <p>
          Zum Schutz vor Missbrauch wird Ihre IP-Adresse kurzzeitig im Arbeitsspeicher verarbeitet, um die Anzahl der Anfragen zu begrenzen; sie wird nicht in der Datenbank
          gespeichert (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
        <LegalReview>Datenbank-Anbieter (Name, Sitz, Serverstandort, Auftragsverarbeitungsvertrag) ergänzen.</LegalReview>
      </LegalSection>

      <LegalSection title="5. Kontaktformular, E-Mail und Telefon">
        <p>
          Bei einer Kontaktaufnahme über das Kontaktformular verarbeiten wir Name, E-Mail-Adresse, optional Telefonnummer, Betreff und Nachricht, um Ihre Anfrage zu beantworten.
          Die Nachricht wird per E-Mail an uns übermittelt und zusätzlich in unserer Datenbank gespeichert, damit keine Anfrage verloren geht. Gleiches gilt sinngemäß, wenn Sie
          uns direkt per E-Mail oder Telefon kontaktieren. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit Ihre Anfrage auf einen Vertrag abzielt, im Übrigen Art. 6 Abs. 1
          lit. f DSGVO (berechtigtes Interesse an der Beantwortung von Anfragen).
        </p>
      </LegalSection>

      <LegalSection title="6. E-Mail-Versand">
        <p>
          Für den Versand von Benachrichtigungen und Eingangsbestätigungen nutzen wir einen E-Mail-Dienstleister, der die Inhalte der jeweiligen E-Mail (Ihre Anfrage-Daten und
          Ihre E-Mail-Adresse) in unserem Auftrag verarbeitet.
        </p>
        <LegalReview>
          E-Mail-Dienstleister (vorgesehen: Resend, Inc., USA) mit Anschrift, Auftragsverarbeitungsvertrag und Grundlage der Drittlandübermittlung ergänzen.
        </LegalReview>
      </LegalSection>

      <LegalSection title="6a. Online-Zahlung">
        <p>
          Sofern für eine Fahrt ein verbindlicher Festpreis angeboten wird, können Sie online über den Zahlungsdienstleister Stripe bezahlen (Stripe Payments Europe, Ltd.,
          Irland). Sie werden dazu auf eine Bezahlseite von Stripe weitergeleitet; Zahlungsdaten (z. B. Kartendaten) geben Sie ausschließlich dort ein – sie werden nicht auf
          unseren Servern gespeichert. Wir erhalten von Stripe den Zahlungsstatus und eine Zahlungsreferenz. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
        </p>
        <LegalReview>Stripe-Vertrag (Datenverarbeitung, Drittlandübermittlung) und tatsächlich aktivierte Zahlarten vor Aktivierung prüfen und ergänzen.</LegalReview>
      </LegalSection>

      <LegalSection title="7. Adress-Autovervollständigung">
        <p>
          Sofern aktiviert, schlägt das Buchungsformular bei der Eingabe von Adressen passende Orte vor. Dazu wird der eingegebene Suchtext über unseren Server an die Google Maps
          Platform (Google Ireland Limited bzw. Google LLC) übermittelt. Ihre IP-Adresse wird dabei nicht an Google weitergegeben, da die Anfrage von unserem Server aus erfolgt.
          Optional kann für eine Anfrage die Fahrstrecke (Entfernung und Dauer) berechnet werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
        </p>
        <LegalReview>Prüfen, ob die Funktion aktiviert wird, und Vertragsgrundlage mit Google (Auftragsverarbeitung / Drittlandübermittlung) ergänzen.</LegalReview>
      </LegalSection>

      <LegalSection title="8. WhatsApp">
        <p>
          Auf der Website befinden sich Links zu WhatsApp. Beim bloßen Aufruf der Website werden keine Daten an WhatsApp übertragen. Erst wenn Sie einen WhatsApp-Link anklicken,
          wird WhatsApp (WhatsApp Ireland Limited, ein Unternehmen der Meta-Gruppe) geöffnet; ein vorbereiteter Nachrichtentext wird nur versendet, wenn Sie dies in WhatsApp selbst
          bestätigen. Für die Verarbeitung innerhalb von WhatsApp gelten die Datenschutzbestimmungen von WhatsApp.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies und lokale Speicherung">
        <p>
          Die öffentliche Website setzt keine Cookies. Wenn Sie über einen Leistungs- oder Fahrzeug-Button zum Buchungsformular wechseln, wird die gewählte Vorauswahl kurzzeitig
          im Sitzungsspeicher Ihres Browsers (sessionStorage) abgelegt und danach gelöscht. Im passwortgeschützten Verwaltungsbereich wird ausschließlich ein technisch
          notwendiges Sitzungs-Cookie für die Anmeldung verwendet (§ 25 Abs. 2 Nr. 2 TDDDG).
        </p>
      </LegalSection>

      <LegalSection title="10. Speicherdauer und Löschung">
        <p>
          Wir speichern personenbezogene Daten nur so lange, wie es für den jeweiligen Zweck erforderlich ist oder gesetzliche Aufbewahrungspflichten (z. B. nach
          Handels- und Steuerrecht) bestehen.
        </p>
        <LegalReview>
          Konkrete Löschfristen festlegen, z. B.: nicht zustande gekommene Buchungsanfragen und Kontaktanfragen nach 6 Monaten; Daten durchgeführter Fahrten nach Ablauf der
          gesetzlichen Aufbewahrungsfristen (bis zu 10 Jahre für buchungsrelevante Unterlagen).
        </LegalReview>
      </LegalSection>

      <LegalSection title="11. Ihre Rechte">
        <p>
          Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20)
          sowie Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21). Wenden Sie sich hierzu an die oben genannten Kontaktdaten. Zudem
          haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, zum Beispiel beim Bayerischen Landesamt für Datenschutzaufsicht (BayLDA).
        </p>
      </LegalSection>

      <LegalSection title="12. Sicherheit">
        <p>
          Diese Website nutzt eine verschlüsselte Verbindung (TLS). Formulareingaben werden serverseitig geprüft. Der Verwaltungsbereich ist durch eine Anmeldung geschützt.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
