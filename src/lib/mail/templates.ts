import { company, siteUrl, telHref } from "@/config/company";
import { vehicleLabel } from "@/config/fleet";
import { formatDateDe } from "@/lib/datetime";
import { tripTypeLabels, type BookingData, type ContactData } from "@/lib/validation";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const nl2br = (v: string) => escapeHtml(v).replace(/\r?\n/g, "<br>");

const C = { ink: "#090909", graphite: "#171717", line: "#2a2a2a", gold: "#C6A66B", ivory: "#F5F2EC", mist: "#A5A5A5" };

function layout(opts: { preheader: string; title: string; intro: string; body: string; footerNote?: string }) {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${C.ink};">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ink};padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:${C.graphite};border:1px solid ${C.line};">
<tr><td style="padding:36px 36px 8px 36px;text-align:center;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:10px;color:${C.ivory};">DEENO</div>
  <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;color:${C.gold};text-transform:uppercase;margin-top:6px;">${escapeHtml(company.brandLine)}</div>
  <div style="width:48px;height:1px;background:${C.gold};margin:22px auto 0;"></div>
</td></tr>
<tr><td style="padding:24px 36px 8px 36px;font-family:Helvetica,Arial,sans-serif;color:${C.ivory};">
  <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:24px;line-height:1.3;margin:0 0 14px;color:${C.ivory};">${escapeHtml(opts.title)}</h1>
  <p style="font-size:15px;line-height:1.65;margin:0 0 18px;color:${C.ivory};">${opts.intro}</p>
  ${opts.body}
</td></tr>
<tr><td style="padding:28px 36px 36px 36px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${C.mist};border-top:1px solid ${C.line};">
  ${opts.footerNote ? `<p style="margin:0 0 12px;">${opts.footerNote}</p>` : ""}
  <strong style="color:${C.ivory};font-weight:normal;">${escapeHtml(company.legalName)}</strong><br>
  Inhaber: ${escapeHtml(company.owner)} · ${escapeHtml(company.address.street)} · ${escapeHtml(company.address.postalCode)} ${escapeHtml(company.address.city)}<br>
  Telefon: <a href="${telHref}" style="color:${C.gold};text-decoration:none;">${escapeHtml(company.phone.display)}</a> · E-Mail: <a href="mailto:${company.email}" style="color:${C.gold};text-decoration:none;">${escapeHtml(company.email)}</a><br>
  <a href="${siteUrl}/impressum" style="color:${C.mist};">Impressum</a> · <a href="${siteUrl}/datenschutz" style="color:${C.mist};">Datenschutz</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

function rows(items: [string, string | undefined | null][]) {
  const filtered = items.filter(([, v]) => v !== undefined && v !== null && v !== "");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 18px;">${filtered
    .map(
      ([k, v]) => `<tr>
<td style="padding:9px 12px 9px 0;border-bottom:1px solid ${C.line};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.mist};vertical-align:top;width:38%;">${escapeHtml(k)}</td>
<td style="padding:9px 0;border-bottom:1px solid ${C.line};font-size:14px;line-height:1.55;color:${C.ivory};vertical-align:top;">${nl2br(String(v))}</td></tr>`,
    )
    .join("")}</table>`;
}

const section = (title: string) =>
  `<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};margin:26px 0 6px;">${escapeHtml(title)}</div>`;

function tripRows(b: BookingData): [string, string | undefined][] {
  const stops = b.stops.map((s) => s.address).filter(Boolean);
  return [
    ["Fahrtart", tripTypeLabels[b.tripType]],
    ["Abholung", b.pickupAddress],
    ["Ziel", b.dropoffAddress ?? (b.tripType === "HOURLY" ? "nach Absprache" : undefined)],
    ["Zwischenstopps", stops.length ? stops.join("\n") : undefined],
    ["Datum", formatDateDe(b.pickupDate)],
    ["Uhrzeit", `${b.pickupTime} Uhr`],
    ["Rückfahrt", b.tripType === "ROUND_TRIP" && b.returnDate ? `${formatDateDe(b.returnDate)}, ${b.returnTime} Uhr` : undefined],
    ["Dauer", b.tripType === "HOURLY" && b.durationHours ? `${b.durationHours} Stunde(n)` : undefined],
    ["Personen", String(b.passengers)],
    ["Gepäckstücke", String(b.luggage)],
    ["Flugnummer", b.flightNumber],
    ["Hinweise zur Fahrt", b.tripNotes],
    ["Fahrzeugklasse", vehicleLabel(b.vehicleClass)],
  ];
}

function tripText(b: BookingData) {
  return tripRows(b)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

/* ───────────── Buchung: Betreiber ───────────── */

export function bookingOperatorMail(b: BookingData, reference: string) {
  const customer: [string, string | undefined][] = [
    ["Name", `${b.firstName} ${b.lastName}`],
    ["E-Mail", b.email],
    ["Telefon", b.phone],
    ["Firma", b.company],
    ["Besondere Wünsche", b.specialRequests],
  ];
  const adminLink = `${siteUrl}/admin`;
  return {
    subject: `Neue Buchungsanfrage ${reference} – ${formatDateDe(b.pickupDate)}, ${b.pickupTime} Uhr`,
    html: layout({
      preheader: `Neue Anfrage ${reference} von ${b.firstName} ${b.lastName}`,
      title: "Neue Buchungsanfrage",
      intro: `Über die Website ist eine neue Anfrage eingegangen. Anfragenummer: <strong style="color:${C.gold};letter-spacing:1px;">${escapeHtml(reference)}</strong><br>Die Anfrage ist noch <strong>nicht bestätigt</strong>. Bitte Verfügbarkeit prüfen und dem Kunden antworten.`,
      body: `${section("Fahrt")}${rows(tripRows(b))}${section("Kunde")}${rows(customer)}
<p style="margin:24px 0 0;"><a href="${adminLink}" style="display:inline-block;background:${C.gold};color:${C.ink};text-decoration:none;padding:13px 22px;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Im Adminbereich öffnen</a></p>`,
      footerNote: "Diese E-Mail wurde automatisch vom Buchungssystem der Website erzeugt. Antworten gehen direkt an den Kunden.",
    }),
    text: `Neue Buchungsanfrage ${reference} (noch nicht bestätigt)\n\n${tripText(b)}\n\nKunde\nName: ${b.firstName} ${b.lastName}\nE-Mail: ${b.email}\nTelefon: ${b.phone}${b.company ? `\nFirma: ${b.company}` : ""}${b.specialRequests ? `\nBesondere Wünsche: ${b.specialRequests}` : ""}\n\nAdmin: ${adminLink}`,
  };
}

/* ───────────── Buchung: Kunde ───────────── */

export function bookingCustomerMail(b: BookingData, reference: string) {
  return {
    subject: `Ihre Buchungsanfrage ${reference} ist eingegangen – DEENO`,
    html: layout({
      preheader: "Ihre Buchungsanfrage ist eingegangen. Wir melden uns zur Bestätigung Ihrer Fahrt.",
      title: `Vielen Dank, ${escapeHtml(b.firstName)} ${escapeHtml(b.lastName)}.`,
      intro: `Ihre Buchungsanfrage ist eingegangen. Wir melden uns zur Bestätigung Ihrer Fahrt.<br><br>Ihre Anfragenummer lautet <strong style="color:${C.gold};letter-spacing:1px;">${escapeHtml(reference)}</strong>. Bitte geben Sie diese bei Rückfragen an.`,
      body: `<p style="font-size:13px;line-height:1.6;color:${C.mist};margin:0 0 8px;">Bitte beachten Sie: Es handelt sich um eine Anfrage. Die Fahrt gilt erst als gebucht, wenn wir sie Ihnen ausdrücklich bestätigt haben. Den Preis erhalten Sie als individuelles Angebot.</p>
${section("Ihre Angaben")}${rows(tripRows(b))}
<p style="font-size:14px;line-height:1.6;margin:22px 0 0;color:${C.ivory};">Möchten Sie etwas ändern? Antworten Sie einfach auf diese E-Mail oder rufen Sie uns an: <a href="${telHref}" style="color:${C.gold};text-decoration:none;">${escapeHtml(company.phone.display)}</a>.</p>`,
      footerNote: "Sie erhalten diese E-Mail, weil über unsere Website eine Buchungsanfrage mit Ihrer E-Mail-Adresse gestellt wurde. Falls Sie dies nicht waren, können Sie diese Nachricht ignorieren.",
    }),
    text: `Vielen Dank, ${b.firstName} ${b.lastName}.\n\nIhre Buchungsanfrage ist eingegangen. Wir melden uns zur Bestätigung Ihrer Fahrt.\nAnfragenummer: ${reference}\n\nHinweis: Die Fahrt gilt erst nach unserer ausdrücklichen Bestätigung als gebucht.\n\n${tripText(b)}\n\nRückfragen: ${company.phone.display} · ${company.email}\n\n${company.legalName}, Inhaber ${company.owner}, ${company.address.street}, ${company.address.postalCode} ${company.address.city}`,
  };
}

/* ───────────── Kontakt: Betreiber ───────────── */

export function contactOperatorMail(c: ContactData) {
  return {
    subject: `Kontaktanfrage: ${c.subject} – ${c.name}`,
    html: layout({
      preheader: `${c.subject} von ${c.name}`,
      title: "Neue Kontaktanfrage",
      intro: "Über das Kontaktformular der Website ist eine Nachricht eingegangen.",
      body: rows([
        ["Betreff", c.subject],
        ["Name", c.name],
        ["E-Mail", c.email],
        ["Telefon", c.phone],
        ["Nachricht", c.message],
      ]),
      footerNote: "Antworten auf diese E-Mail gehen direkt an den Absender.",
    }),
    text: `Neue Kontaktanfrage\n\nBetreff: ${c.subject}\nName: ${c.name}\nE-Mail: ${c.email}${c.phone ? `\nTelefon: ${c.phone}` : ""}\n\n${c.message}`,
  };
}

/* ───────────── Buchung bezahlt (nach Stripe-Webhook) ───────────── */

type PaidBooking = {
  reference: string;
  firstName: string;
  lastName: string;
  tripType: keyof typeof tripTypeLabels;
  pickupAddress: string;
  dropoffAddress: string | null;
  pickupDate: string;
  pickupTime: string;
  vehicleClass: string;
  passengers: number;
  amountPaidCents: number | null;
  email: string;
  phone: string;
};

const euro = (cents: number | null) => (cents === null ? "–" : new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100));

function paidRows(b: PaidBooking): [string, string | undefined][] {
  return [
    ["Buchungsnummer", b.reference],
    ["Fahrtart", tripTypeLabels[b.tripType]],
    ["Abholung", b.pickupAddress],
    ["Ziel", b.dropoffAddress ?? "nach Absprache"],
    ["Datum / Uhrzeit", `${formatDateDe(b.pickupDate)}, ${b.pickupTime} Uhr`],
    ["Fahrzeugklasse", vehicleLabel(b.vehicleClass)],
    ["Personen", String(b.passengers)],
    ["Bezahlt", euro(b.amountPaidCents)],
  ];
}

export function bookingPaidCustomerMail(b: PaidBooking) {
  const list = paidRows(b);
  return {
    subject: `Buchungsbestätigung ${b.reference} – DEENO`,
    html: layout({
      preheader: "Ihre Zahlung ist eingegangen – Ihre Fahrt ist gebucht.",
      title: `Ihre Fahrt ist gebucht, ${escapeHtml(b.firstName)} ${escapeHtml(b.lastName)}.`,
      intro: `Vielen Dank für Ihre Zahlung. Hiermit bestätigen wir Ihre Buchung <strong style="color:${C.gold};letter-spacing:1px;">${escapeHtml(b.reference)}</strong>. Die Zahlungsquittung erhalten Sie separat von unserem Zahlungsdienstleister Stripe.`,
      body: `${section("Ihre Buchung")}${rows(list)}<p style="font-size:14px;line-height:1.6;margin:22px 0 0;color:${C.ivory};">Fragen oder Änderungen? Antworten Sie auf diese E-Mail oder rufen Sie uns an: <a href="${telHref}" style="color:${C.gold};text-decoration:none;">${escapeHtml(company.phone.display)}</a>.</p>`,
    }),
    text: `Ihre Fahrt ist gebucht.\n\n${list.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nRückfragen: ${company.phone.display} · ${company.email}`,
  };
}

export function bookingPaidOperatorMail(b: PaidBooking) {
  const list: [string, string | undefined][] = [...paidRows(b), ["Kunde", `${b.firstName} ${b.lastName}`], ["E-Mail", b.email], ["Telefon", b.phone]];
  return {
    subject: `BEZAHLT: Buchung ${b.reference} – ${formatDateDe(b.pickupDate)}, ${b.pickupTime} Uhr`,
    html: layout({ preheader: `Zahlung eingegangen für ${b.reference}`, title: "Online-Zahlung eingegangen", intro: "Die folgende Buchung wurde online bezahlt und ist damit verbindlich gebucht.", body: rows(list) }),
    text: `Online-Zahlung eingegangen\n\n${list.map(([k, v]) => `${k}: ${v}`).join("\n")}`,
  };
}
