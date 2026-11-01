import Link from "next/link";
import { notFound } from "next/navigation";
import { vehicleLabel } from "@/config/fleet";
import { formatDateDe, formatDateTimeDe } from "@/lib/datetime";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { bookingStatusLabels, bookingStatuses, tripTypeLabels } from "@/lib/validation";
import { saveAdminNotes, updateBookingStatus } from "../../../actions";
import { StatusBadge } from "../../status-badge";

export const metadata = { title: "Anfrage" };

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const b = await db().bookingRequest.findUnique({ where: { id }, include: { statusHistory: { orderBy: { changedAt: "desc" } } } });
  if (!b) notFound();

  const rows: [string, string | null | undefined][] = [
    ["Fahrtart", tripTypeLabels[b.tripType]],
    ["Abholung", b.pickupAddress],
    ["Ziel", b.dropoffAddress ?? (b.tripType === "HOURLY" ? "nach Absprache" : "–")],
    ["Zwischenstopps", b.stops.length ? b.stops.join("\n") : null],
    ["Datum / Uhrzeit", `${formatDateDe(b.pickupDate)}, ${b.pickupTime} Uhr`],
    ["Rückfahrt", b.returnDate ? `${formatDateDe(b.returnDate)}, ${b.returnTime} Uhr` : null],
    ["Dauer", b.durationHours ? `${b.durationHours} Std.` : null],
    ["Personen / Gepäck", `${b.passengers} / ${b.luggage}`],
    ["Flugnummer", b.flightNumber],
    ["Hinweise", b.tripNotes],
    ["Fahrzeugklasse", vehicleLabel(b.vehicleClass)],
    ["Preis (serverseitig)", b.quotedPrice ? `${Number(b.quotedPrice).toFixed(2)} € (${b.pricingSource ?? "–"})` : null],
    ["Zahlung", { NOT_REQUIRED: "keine Online-Zahlung", PENDING: "ausstehend (Checkout gestartet)", PAID: `bezahlt${b.amountPaidCents ? ` – ${(b.amountPaidCents / 100).toFixed(2)} €` : ""}`, FAILED: "fehlgeschlagen", EXPIRED: "abgelaufen", REFUNDED: "erstattet" }[b.paymentStatus]],
    ["Strecke (berechnet)", b.distanceMeters ? `${(b.distanceMeters / 1000).toFixed(1)} km · ${Math.round((b.durationSeconds ?? 0) / 60)} Min.` : null],
  ];
  const customer: [string, string | null | undefined][] = [
    ["Name", `${b.firstName} ${b.lastName}`],
    ["Firma", b.company],
    ["E-Mail", b.email],
    ["Telefon", b.phone],
    ["Besondere Wünsche", b.specialRequests],
    ["Datenschutzhinweis bestätigt", formatDateTimeDe(b.privacyAckAt)],
  ];
  const phoneDigits = b.phone.replace(/[^\d+]/g, "").replace(/^00/, "+").replace(/^0/, "+49");
  const mailSubject = encodeURIComponent(`Ihre Anfrage ${b.reference} – DEENO Chauffeurservice`);
  const mailBody = encodeURIComponent(
    `Guten Tag ${b.firstName} ${b.lastName},\n\nvielen Dank für Ihre Anfrage ${b.reference} für den ${formatDateDe(b.pickupDate)} um ${b.pickupTime} Uhr.\n\n`,
  );

  return (
    <div>
      <Link href="/admin" className="text-xs uppercase tracking-[0.16em] text-mist hover:text-gold">
        ← Alle Anfragen
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <h1 className="display text-4xl tracking-wide">{b.reference}</h1>
        <StatusBadge status={b.status} />
      </div>
      <p className="mt-2 text-sm text-mist">
        Eingegangen am {formatDateTimeDe(b.createdAt)} · Betreiber benachrichtigt: {b.operatorNotifiedAt ? "ja" : "nein"} · Kunde benachrichtigt:{" "}
        {b.customerNotifiedAt ? "ja" : "nein"}
      </p>
      {b.notificationError && <p className="mt-2 text-xs text-error">E-Mail-Hinweis: {b.notificationError}</p>}

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {[
            { title: "Fahrt", data: rows },
            { title: "Kunde", data: customer },
          ].map((block) => (
            <section key={block.title} className="border border-white/[0.08] bg-coal p-6">
              <h2 className="eyebrow mb-4">{block.title}</h2>
              <dl className="divide-y divide-white/[0.06] text-sm">
                {block.data
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[11rem_1fr] gap-4 py-2.5">
                      <dt className="text-xs uppercase tracking-[0.12em] text-mist">{k}</dt>
                      <dd className="whitespace-pre-line break-words">{v}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          ))}
          <div className="flex flex-wrap gap-3">
            <a href={`mailto:${b.email}?subject=${mailSubject}&body=${mailBody}`} className="btn btn-ghost min-h-11 px-4">
              E-Mail an Kunden
            </a>
            <a href={`tel:${phoneDigits}`} className="btn btn-ghost min-h-11 px-4">
              Anrufen
            </a>
            <a href={`https://wa.me/${phoneDigits.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost min-h-11 px-4">
              WhatsApp
            </a>
          </div>
        </div>

        <aside className="space-y-8">
          <section className="border border-white/[0.08] bg-coal p-6">
            <h2 className="eyebrow mb-4">Status ändern</h2>
            <form action={updateBookingStatus} className="space-y-4">
              <input type="hidden" name="id" value={b.id} />
              <select name="status" defaultValue={b.status} className="field" aria-label="Status">
                {bookingStatuses.map((s) => (
                  <option key={s} value={s}>
                    {bookingStatusLabels[s]}
                  </option>
                ))}
              </select>
              <textarea name="note" rows={2} className="field" placeholder="Notiz zur Änderung (optional)" aria-label="Notiz" />
              <button className="btn btn-gold w-full min-h-11">Speichern</button>
            </form>
            <p className="mt-3 text-xs text-mist">Hinweis: Der Kunde wird nicht automatisch benachrichtigt. Bitte bestätigen Sie die Fahrt persönlich.</p>
          </section>

          <section className="border border-white/[0.08] bg-coal p-6">
            <h2 className="eyebrow mb-4">Interne Notizen</h2>
            <form action={saveAdminNotes} className="space-y-4">
              <input type="hidden" name="id" value={b.id} />
              <textarea name="adminNotes" rows={5} defaultValue={b.adminNotes ?? ""} className="field" aria-label="Interne Notizen" />
              <button className="btn btn-ghost w-full min-h-11">Notizen speichern</button>
            </form>
          </section>

          <section className="border border-white/[0.08] bg-coal p-6">
            <h2 className="eyebrow mb-4">Verlauf</h2>
            <ol className="space-y-4 text-sm">
              {b.statusHistory.map((h) => (
                <li key={h.id} className="border-l border-gold/40 pl-4">
                  <p>
                    {h.fromStatus ? `${bookingStatusLabels[h.fromStatus]} → ` : ""}
                    <strong className="font-medium">{bookingStatusLabels[h.toStatus]}</strong>
                  </p>
                  {h.note && <p className="text-ivory/70">{h.note}</p>}
                  <p className="text-xs text-mist">
                    {formatDateTimeDe(h.changedAt)} · {h.changedBy}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
