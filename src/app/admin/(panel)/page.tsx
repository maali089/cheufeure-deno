import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { vehicleBySlug } from "@/config/fleet";
import { formatDateDe, formatDateTimeDe } from "@/lib/datetime";
import { formatEuro } from "@/lib/price";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { bookingStatusLabels, bookingStatuses, tripTypeLabels, type BookingStatusValue } from "@/lib/validation";
import { StatusBadge } from "./status-badge";

export const metadata = { title: "Buchungsanfragen" };

const PAGE_SIZE = 30;

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string; sort?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = bookingStatuses.includes(sp.status as BookingStatusValue) ? (sp.status as BookingStatusValue) : undefined;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const sortByPickup = sp.sort === "fahrt";

  const where: Prisma.BookingRequestWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total, counts] = await Promise.all([
    db().bookingRequest.findMany({
      where,
      orderBy: sortByPickup ? [{ pickupDate: "asc" }, { pickupTime: "asc" }] : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, reference: true, status: true, tripType: true, pickupDate: true, pickupTime: true, pickupAddress: true, dropoffAddress: true, firstName: true, lastName: true, vehicleClass: true, createdAt: true, passengers: true, phone: true, agreedPrice: true },
    }),
    db().bookingRequest.count({ where }),
    db().bookingRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countFor = (s: BookingStatusValue) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status, q: q || undefined, sort: sortByPickup ? "fahrt" : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <div>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="display text-4xl">Buchungsanfragen</h1>
          <p className="mt-2 text-sm text-mist">{total} Anfrage(n){status ? ` mit Status „${bookingStatusLabels[status]}“` : ""}</p>
        </div>
        <form className="flex gap-2" action="/admin">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Name, E-Mail, Nummer …" className="field min-h-11 w-full min-w-0 md:w-64" aria-label="Suche" />
          <button className="btn btn-ghost min-h-11 px-4">Suchen</button>
        </form>
      </div>

      <nav aria-label="Status-Filter" className="mt-8 flex flex-wrap gap-2 text-xs">
        <Link href={qs({ status: undefined, page: undefined })} className={`border px-3 py-2 uppercase tracking-[0.14em] ${!status ? "border-gold text-gold" : "border-white/15 text-ivory/70 hover:border-white/30"}`}>
          Alle
        </Link>
        {bookingStatuses.map((s) => (
          <Link key={s} href={qs({ status: s, page: undefined })} className={`border px-3 py-2 uppercase tracking-[0.14em] ${status === s ? "border-gold text-gold" : "border-white/15 text-ivory/70 hover:border-white/30"}`}>
            {bookingStatusLabels[s]} <span className="ml-1 text-mist">{countFor(s)}</span>
          </Link>
        ))}
        <Link href={qs({ sort: sortByPickup ? undefined : "fahrt", page: undefined })} className="ml-auto border border-white/15 px-3 py-2 uppercase tracking-[0.14em] text-ivory/70 hover:border-white/30">
          Sortierung: {sortByPickup ? "Fahrtdatum" : "Eingang"}
        </Link>
      </nav>

      {/* Smartphone: Karten statt breiter Tabelle */}
      <ul className="mt-6 space-y-3 md:hidden" aria-label="Anfragen">
        {items.length === 0 && <li className="border border-white/[0.08] px-4 py-10 text-center text-sm text-mist">Keine Anfragen gefunden.</li>}
        {items.map((b) => (
          <li key={b.id}>
            <Link href={`/admin/anfragen/${b.id}`} className="block border border-white/[0.08] bg-coal p-4 active:border-gold/60">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium tracking-wide text-gold">{b.reference}</span>
                <StatusBadge status={b.status} />
              </div>
              <p className="mt-3 text-sm">
                {formatDateDe(b.pickupDate)}, {b.pickupTime} Uhr · {tripTypeLabels[b.tripType]}
              </p>
              <p className="mt-1 text-sm">
                {b.firstName} {b.lastName} <span className="text-mist">· {b.phone}</span>
              </p>
              <p className="mt-1 truncate text-xs text-mist">
                {b.pickupAddress} → {b.dropoffAddress ?? "nach Absprache"}
              </p>
              <p className="mt-1 text-xs text-mist">
                {vehicleBySlug(b.vehicleClass)?.category ?? b.vehicleClass} · {b.passengers} Pers.
                {b.agreedPrice ? <span className="text-ivory/80"> · {formatEuro(b.agreedPrice)}</span> : null}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 hidden overflow-x-auto border border-white/[0.08] md:block">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-coal text-[0.62rem] uppercase tracking-[0.16em] text-mist">
            <tr>
              <th className="px-4 py-3 font-semibold">Nummer</th>
              <th className="px-4 py-3 font-semibold">Fahrt</th>
              <th className="px-4 py-3 font-semibold">Kunde</th>
              <th className="px-4 py-3 font-semibold">Strecke</th>
              <th className="px-4 py-3 font-semibold">Fahrzeug</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Eingang</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-mist">
                  Keine Anfragen gefunden.
                </td>
              </tr>
            )}
            {items.map((b) => (
              <tr key={b.id} className="align-top hover:bg-white/[0.02]">
                <td className="px-4 py-4">
                  <Link href={`/admin/anfragen/${b.id}`} className="font-medium tracking-wide text-gold hover:underline">
                    {b.reference}
                  </Link>
                </td>
                <td className="px-4 py-4">
                  <span className="block">{formatDateDe(b.pickupDate)}</span>
                  <span className="text-xs text-mist">
                    {b.pickupTime} Uhr · {tripTypeLabels[b.tripType]}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {b.firstName} {b.lastName}
                  <span className="block text-xs text-mist">
                    {b.phone} · {b.passengers} Pers.
                  </span>
                </td>
                <td className="max-w-xs px-4 py-4 text-xs text-ivory/80">
                  <span className="block truncate">{b.pickupAddress}</span>
                  <span className="block truncate text-mist">→ {b.dropoffAddress ?? "nach Absprache"}</span>
                </td>
                <td className="px-4 py-4 text-xs">{vehicleBySlug(b.vehicleClass)?.category ?? b.vehicleClass}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={b.status} />
                  {b.agreedPrice && <span className="mt-1 block text-xs text-ivory/80">{formatEuro(b.agreedPrice)}</span>}
                </td>
                <td className="px-4 py-4 text-xs text-mist">{formatDateTimeDe(b.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Seiten" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs({ page: String(page - 1) })} className="text-gold hover:underline">← Zurück</Link> : <span />}
          <span className="text-mist">
            Seite {page} von {pages}
          </span>
          {page < pages ? <Link href={qs({ page: String(page + 1) })} className="text-gold hover:underline">Weiter →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
