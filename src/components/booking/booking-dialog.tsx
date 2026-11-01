"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BrandMark } from "@/components/brand";
import { CloseIcon, PhoneIcon } from "@/components/icons";
import { PRESELECT_EVENT, type PreselectDetail } from "@/components/ui/preselect";
import { company, telHref } from "@/config/company";
import { BookingForm, DRAFT_EVENT, type BookingVehicle } from "./booking-form";

interface Ctx {
  open: (preselect?: PreselectDetail) => void;
  close: () => void;
  isOpen: boolean;
}

const BookingDialogContext = createContext<Ctx | null>(null);

export function useBookingDialog() {
  const ctx = useContext(BookingDialogContext);
  if (!ctx) throw new Error("useBookingDialog außerhalb des Providers");
  return ctx;
}

/**
 * Buchungsfenster: Desktop als seitliches Panel, Smartphone als Vollbild.
 * Eingaben bleiben beim Schließen erhalten (Entwurf im sessionStorage).
 */
export function BookingDialogProvider({ children, vehicles, placesEnabled }: { children: ReactNode; vehicles: BookingVehicle[]; placesEnabled: boolean }) {
  const pathname = usePathname();
  // Fenster gehört zur Seite, auf der es geöffnet wurde (schließt bei Seitenwechsel automatisch)
  const [openOn, setOpenOn] = useState<string | null>(null);
  const isOpen = openOn === pathname;
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const reduce = useReducedMotion();
  const lastFocus = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const open = useCallback((preselect?: PreselectDetail) => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setOpenOn(window.location.pathname);
    if (preselect) {
      try {
        sessionStorage.setItem(PRESELECT_EVENT, JSON.stringify(preselect));
      } catch {}
      setTimeout(() => window.dispatchEvent(new CustomEvent(PRESELECT_EVENT, { detail: preselect })), 60);
    }
  }, []);

  const close = useCallback(() => {
    setOpenOn(null);
    // Inline-Formular übernimmt den aktuellen Entwurf
    window.dispatchEvent(new CustomEvent(DRAFT_EVENT, { detail: "dialog-closed" }));
    setTimeout(() => lastFocus.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const outside = ["main", "site-header", "site-footer"].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    outside.forEach((el) => el.setAttribute("inert", ""));
    const t = setTimeout(() => panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prevOverflow;
      outside.forEach((el) => el.removeAttribute("inert"));
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <BookingDialogContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div className="fixed inset-0 z-[80]" role="presentation">
                <motion.div
                  aria-hidden
                  className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  onClick={close}
                />
                <motion.div
                  ref={panelRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="booking-dialog-title"
                  className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-gold/20 bg-ink shadow-[0_0_80px_rgba(0,0,0,0.8)] md:w-[min(46rem,92vw)]"
                  initial={reduce ? { opacity: 0 } : { x: "100%" }}
                  animate={reduce ? { opacity: 1 } : { x: 0 }}
                  exit={reduce ? { opacity: 0 } : { x: "100%" }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-8">
                    <div className="flex items-center gap-5">
                      <span className="hidden sm:block">
                        <BrandMark compact />
                      </span>
                      <h2 id="booking-dialog-title" className="font-display text-2xl text-ivory sm:border-l sm:border-white/10 sm:pl-5">
                        Fahrt buchen
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={telHref} className="hidden items-center gap-2 px-3 py-2 text-xs text-mist hover:text-gold sm:flex">
                        <PhoneIcon size={15} /> {company.phone.display}
                      </a>
                      <button
                        type="button"
                        data-autofocus
                        onClick={close}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-ivory transition-colors hover:border-gold hover:text-gold"
                        aria-label="Buchungsfenster schließen"
                      >
                        <CloseIcon size={20} />
                      </button>
                    </div>
                  </header>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),2rem)] pt-6 md:px-8 md:pt-8">
                    <p className="mb-6 text-xs text-mist">Ihre Eingaben bleiben erhalten, wenn Sie das Fenster schließen.</p>
                    <BookingForm vehicles={vehicles} placesEnabled={placesEnabled} instanceId="dialog" />
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </BookingDialogContext.Provider>
  );
}
