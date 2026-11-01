import type { ReactNode } from "react";

export function LegalPage({ eyebrow, title, children, updated }: { eyebrow: string; title: string; children: ReactNode; updated?: string }) {
  return (
    <article className="pb-28 pt-36 md:pt-44">
      <div className="container-lux">
        <header className="max-w-3xl">
          <p className="eyebrow mb-6 flex items-center gap-4">
            <span className="gold-rule w-10" aria-hidden /> {eyebrow}
          </p>
          <h1 className="display text-[2.6rem] sm:text-5xl md:text-6xl">{title}</h1>
          {updated && <p className="mt-6 text-sm text-mist">Stand: {updated}</p>}
        </header>
        <div className="legal mt-14 max-w-3xl space-y-12 text-[0.98rem] leading-relaxed text-ivory/80">{children}</div>
      </div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-white/[0.08] pt-8">
      <h2 className="font-display text-[1.7rem] leading-tight text-ivory">{title}</h2>
      {children}
    </section>
  );
}

/** Kennzeichnung offener Punkte, die vor Veröffentlichung rechtlich geprüft/ergänzt werden müssen. */
export function LegalReview({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-2 border-gold bg-gold/[0.06] px-4 py-3 text-sm text-ivory/85" data-legal-review>
      <span className="mr-2 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-gold">Zur rechtlichen Prüfung</span>
      {children}
    </p>
  );
}
