import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon, MailIcon, PhoneIcon, WhatsappIcon } from "@/components/icons";
import { company, mailHref, telHref } from "@/config/company";
import { bookingReferencePattern } from "@/lib/reference";
import { whatsappHref } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Buchungsanfrage eingegangen",
  robots: { index: false, follow: false },
};

/** Eingangsbestätigung – zeigt nur die Anfragenummer, keine Kundendaten (kein Zugriff auf fremde Daten möglich). */
export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ nr?: string; m?: string; zahlung?: string }> }) {
  const { nr, m, zahlung } = await searchParams;
  const reference = nr && bookingReferencePattern.test(nr) ? nr : null;
  const mailSent = m === "1";

  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden pb-24 pt-36">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-[50rem] w-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(198,166,107,0.09),transparent_60%)]" />
      <div className="container-lux relative">
        <div className="mx-auto max-w-2xl text-center">
          <span className="hero-rise mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold text-gold">
            <CheckIcon size={28} />
          </span>
          <p className="hero-rise eyebrow mt-10" style={{ animationDelay: "0.15s" }}>
            Vielen Dank
          </p>
          <h1 className="display hero-rise mt-5 text-[2.4rem] sm:text-5xl md:text-6xl" style={{ animationDelay: "0.25s" }}>
            Ihre Buchungsanfrage ist eingegangen.
          </h1>
          <p className="hero-rise mx-auto mt-6 max-w-lg text-lg leading-relaxed text-ivory/75" style={{ animationDelay: "0.4s" }}>
            Wir melden uns zur Bestätigung Ihrer Fahrt.
          </p>

          {reference && (
            <div className="hero-rise mx-auto mt-12 inline-block border border-gold/40 px-8 py-6" style={{ animationDelay: "0.55s" }}>
              <p className="text-[0.62rem] uppercase tracking-[0.3em] text-mist">Ihre Anfragenummer</p>
              <p className="mt-2 font-display text-3xl tracking-[0.12em] text-gold" data-testid="booking-reference">
                {reference}
              </p>
            </div>
          )}

          {zahlung === "erfolgreich" && (
            <p className="hero-rise mx-auto mt-10 max-w-lg border border-gold/40 bg-gold/[0.06] px-5 py-4 text-sm leading-relaxed text-ivory" style={{ animationDelay: "0.6s" }} role="status">
              Vielen Dank für Ihre Zahlung. Sobald unser Zahlungsdienstleister die Zahlung bestätigt hat, erhalten Sie Ihre verbindliche Buchungsbestätigung per E-Mail.
            </p>
          )}
          {zahlung === "abgebrochen" && (
            <p className="hero-rise mx-auto mt-10 max-w-lg border border-white/15 px-5 py-4 text-sm leading-relaxed text-ivory/85" style={{ animationDelay: "0.6s" }} role="status">
              Die Zahlung wurde abgebrochen – es wurde nichts belastet. Ihre Anfrage liegt uns dennoch vor; wir melden uns bei Ihnen.
            </p>
          )}
          {zahlung === "fehler" && (
            <p className="hero-rise mx-auto mt-10 max-w-lg border border-white/15 px-5 py-4 text-sm leading-relaxed text-ivory/85" style={{ animationDelay: "0.6s" }} role="status">
              Die Online-Zahlung war gerade nicht verfügbar – es wurde nichts belastet. Ihre Anfrage liegt uns vor; wir melden uns mit allen Details.
            </p>
          )}

          <div className="hero-rise mx-auto mt-12 max-w-lg space-y-4 text-sm leading-relaxed text-mist" style={{ animationDelay: "0.7s" }}>
            <p>
              Bitte beachten Sie: Ihre Fahrt gilt erst als gebucht, wenn wir sie Ihnen ausdrücklich bestätigt haben. Bis dahin handelt es sich um eine Anfrage.
            </p>
            <p>
              {mailSent
                ? "Eine Eingangsbestätigung haben wir an Ihre E-Mail-Adresse gesendet. Bitte prüfen Sie gegebenenfalls auch Ihren Spam-Ordner."
                : "Eine Eingangsbestätigung per E-Mail konnte nicht versendet werden. Ihre Anfrage liegt uns trotzdem vor – notieren Sie sich bitte Ihre Anfragenummer."}
            </p>
          </div>

          <div className="hero-rise mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "0.85s" }}>
            <Link href="/" className="btn btn-gold">
              Zur Startseite
            </Link>
            <a href={telHref} className="btn btn-ghost">
              <PhoneIcon size={16} /> {company.phone.display}
            </a>
          </div>
          <div className="mt-8 flex justify-center gap-6 text-xs uppercase tracking-[0.2em] text-ivory/60">
            <a href={mailHref} className="flex items-center gap-2 hover:text-gold">
              <MailIcon size={16} /> E-Mail
            </a>
            <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-gold">
              <WhatsappIcon size={16} /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
