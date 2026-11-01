"use client";

import { useEffect, useState } from "react";
import { useBookingDialog } from "@/components/booking/booking-dialog";
import { CarIcon, WhatsappIcon } from "@/components/icons";
import { whatsappHref } from "@/lib/whatsapp";

/**
 * Schwebende Bedienelemente rechts unten: „Jetzt Fahrt buchen“ (öffnet das Buchungsfenster)
 * und WhatsApp. Blenden sich über Formularen und dem Footer aus, damit nichts verdeckt wird.
 */
export function ContactDock() {
  const { open, isOpen } = useBookingDialog();
  const [hidden, setHidden] = useState(false);
  // Mobil: erst nach dem Hero einblenden (dort gibt es bereits einen Buchungsbutton)
  const [inHero, setInHero] = useState(false);

  useEffect(() => {
    const ids = ["buchen", "kontakt", "site-footer"];
    const state = new Map<Element, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) state.set(e.target, e.isIntersecting);
        setHidden([...state.values()].some(Boolean));
      },
      { rootMargin: "-35% 0px -10% 0px" },
    );
    ids.map((id) => document.getElementById(id)).forEach((el) => el && io.observe(el));
    const hero = document.getElementById("start");
    const mq = window.matchMedia("(max-width: 767px)");
    const heroIo = new IntersectionObserver(([e]) => setInHero(!!e?.isIntersecting && e.intersectionRatio > 0.35 && mq.matches), { threshold: [0, 0.35, 0.6, 1] });
    if (hero) heroIo.observe(hero);
    return () => {
      io.disconnect();
      heroIo.disconnect();
    };
  }, []);

  const off = hidden || isOpen || inHero;

  return (
    <div
      className={`fixed bottom-[max(env(safe-area-inset-bottom),1rem)] right-4 z-40 flex items-center gap-3 transition-all duration-700 ease-[var(--ease-lux)] md:bottom-7 md:right-7 md:flex-col md:items-end ${
        off ? "pointer-events-none translate-y-6 opacity-0" : "translate-y-0 opacity-100"
      }`}
      aria-hidden={off}
    >
      <a
        href={whatsappHref()}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={off ? -1 : 0}
        aria-label="Fahrt per WhatsApp anfragen (öffnet WhatsApp)"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/45 bg-ink/85 text-gold shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur transition-all duration-500 hover:border-gold hover:bg-gold hover:text-ink md:order-none"
      >
        <WhatsappIcon size={22} />
      </a>
      <button
        type="button"
        tabIndex={off ? -1 : 0}
        onClick={() => open()}
        data-testid="floating-booking"
        className="group relative isolate flex h-12 items-center gap-3 overflow-hidden rounded-full border border-gold/70 bg-graphite/95 pl-4 pr-5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold shadow-[0_14px_40px_-14px_rgba(198,166,107,0.45)] backdrop-blur transition-all duration-500 hover:border-gold hover:text-ink md:h-14 md:pl-5 md:pr-6"
      >
        <span aria-hidden className="absolute inset-0 -z-10 origin-left scale-x-0 bg-gold transition-transform duration-700 ease-[var(--ease-lux)] group-hover:scale-x-100" />
        <CarIcon size={22} className="transition-transform duration-700 ease-[var(--ease-lux)] group-hover:translate-x-0.5" />
        Jetzt Fahrt buchen
      </button>
    </div>
  );
}
