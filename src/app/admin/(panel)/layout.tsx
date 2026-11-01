import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { requireAdmin } from "@/lib/server/auth";
import { isDatabaseConfigured } from "@/lib/server/db";
import { logoutAction } from "../actions";

const nav = [
  { href: "/admin", label: "Buchungsanfragen" },
  { href: "/admin/nachrichten", label: "Nachrichten" },
  { href: "/admin/flotte", label: "Flotte" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <div>
      <header className="border-b border-white/[0.08] bg-coal">
        <div className="container-lux flex flex-wrap items-center justify-between gap-4 py-5">
          <Link href="/admin" aria-label="Verwaltung – Übersicht">
            <BrandMark compact />
          </Link>
          <nav aria-label="Verwaltung" className="order-3 w-full md:order-none md:w-auto">
            <ul className="flex gap-6 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ivory/75">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="link-lux hover:text-ivory">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <form action={logoutAction} className="flex items-center gap-4 text-xs text-mist">
            <span className="hidden sm:inline">Angemeldet als {session.username}</span>
            <button type="submit" className="border border-white/15 px-3 py-2 uppercase tracking-[0.16em] text-ivory/80 hover:border-gold hover:text-gold">
              Abmelden
            </button>
          </form>
        </div>
      </header>
      <main className="container-lux py-10">
        {!isDatabaseConfigured() ? (
          <p className="border-l-2 border-gold bg-gold/[0.06] px-4 py-3 text-sm">DATABASE_URL ist nicht gesetzt – es können keine Daten angezeigt werden.</p>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
