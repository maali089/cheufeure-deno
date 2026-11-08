"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { BrandLink, BrandMark } from "@/components/brand";
import { CloseIcon, MailIcon, MenuIcon, PhoneIcon, WhatsappIcon } from "@/components/icons";
import { company, mailHref, telHref } from "@/config/company";
import { navigation } from "@/config/content";
import { whatsappHref } from "@/lib/whatsapp";
import { useActiveSection } from "./use-active-section";

const sectionIds = navigation.map((n) => n.id);

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(sectionIds);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const toggle = toggleRef.current;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    const t = setTimeout(() => firstLinkRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prev;
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      toggle?.focus();
    };
  }, [open]);

  const solid = scrolled || !isHome || open;

  return (
    <>
      <header
        id="site-header"
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter,padding] duration-700 ease-[var(--ease-lux)] ${
          solid ? "border-b border-white/[0.06] bg-ink/80 py-3 backdrop-blur-xl" : "border-b border-transparent bg-gradient-to-b from-ink/70 to-transparent py-5"
        }`}
        style={{ paddingTop: `max(env(safe-area-inset-top), ${solid ? "0.75rem" : "1.25rem"})` }}
      >
        <div className="container-lux flex items-center justify-between gap-3 sm:gap-6">
          <BrandLink compact={scrolled} />

          <nav aria-label="Hauptnavigation" className="hidden xl:block">
            <ul className="flex items-center gap-6 2xl:gap-8">
              {navigation.map((item) => {
                const isActive = isHome && active === item.id;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "true" : undefined}
                      className={`link-lux whitespace-nowrap text-[0.68rem] font-medium uppercase tracking-[0.18em] transition-colors duration-500 ${
                        isActive ? "text-gold" : "text-ivory/80 hover:text-ivory"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/#buchen" className="btn btn-gold hidden min-h-11 px-5 text-[0.68rem] sm:inline-flex">
              Jetzt Fahrt anfragen
            </Link>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="relative z-[60] -mr-2 flex h-11 w-11 items-center justify-center text-ivory xl:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Menü schließen" : "Menü öffnen"}
            >
              {open ? <CloseIcon size={26} /> : <MenuIcon size={26} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-0 z-[55] flex flex-col bg-ink/[0.97] backdrop-blur-xl xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="container-lux flex h-full flex-col pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-28">
              <nav aria-label="Mobile Navigation" className="flex-1">
                <ul className="space-y-1">
                  {navigation.map((item, i) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link
                        ref={i === 0 ? firstLinkRef : undefined}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-baseline gap-4 py-2.5 font-display text-[2.1rem] leading-tight ${
                          isHome && active === item.id ? "text-gold" : "text-ivory"
                        }`}
                      >
                        <span className="font-sans text-[0.65rem] tracking-[0.2em] text-mist">{String(i + 1).padStart(2, "0")}</span>
                        {item.label}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.6 }} className="space-y-5">
                <Link href="/#buchen" onClick={() => setOpen(false)} className="btn btn-gold w-full">
                  Jetzt Fahrt anfragen
                </Link>
                <div className="grid grid-cols-3 gap-2 text-[0.65rem] uppercase tracking-[0.16em] text-ivory/85">
                  <a href={telHref} className="flex flex-col items-center gap-2 border border-line py-3.5">
                    <PhoneIcon size={20} className="text-gold" />
                    Anrufen
                  </a>
                  <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 border border-line py-3.5">
                    <WhatsappIcon size={20} className="text-gold" />
                    WhatsApp
                  </a>
                  <a href={mailHref} className="flex flex-col items-center gap-2 border border-line py-3.5">
                    <MailIcon size={20} className="text-gold" />
                    E-Mail
                  </a>
                </div>
                <div className="flex items-end justify-between border-t border-line pt-5 text-xs text-mist">
                  <BrandMark compact />
                  <span>{company.phone.display}</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
