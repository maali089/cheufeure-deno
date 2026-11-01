import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { MailIcon, PhoneIcon, WhatsappIcon } from "@/components/icons";
import { company, mailHref, telHref } from "@/config/company";
import { navigation, services } from "@/config/content";
import { whatsappHref } from "@/lib/whatsapp";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="site-footer" className="relative border-t border-white/[0.06] bg-coal pb-28 pt-20 md:pb-12">
      <div className="container-lux">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <BrandMark />
            <p className="mt-7 max-w-xs text-sm leading-relaxed text-mist">
              Persönlicher Chauffeur- und Limousinenservice mit hohem Anspruch an Komfort, Diskretion und Zuverlässigkeit.
            </p>
            <Link href="/#buchen" className="btn btn-gold mt-8 min-h-12 px-6 text-[0.68rem]">
              Fahrt anfragen
            </Link>
          </div>

          <nav aria-label="Footer-Navigation" className="md:col-span-2">
            <h2 className="eyebrow mb-5">Navigation</h2>
            <ul className="space-y-3 text-sm text-ivory/80">
              {navigation.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} className="link-lux hover:text-ivory">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <h2 className="eyebrow mb-5">Leistungen</h2>
            <ul className="space-y-3 text-sm text-ivory/80">
              {services.map((s) => (
                <li key={s.key}>
                  <Link href="/#leistungen" className="link-lux hover:text-ivory">
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h2 className="eyebrow mb-5">Kontakt</h2>
            <ul className="space-y-4 text-sm">
              <li>
                <a href={telHref} className="group flex items-center gap-3 text-ivory/90 hover:text-gold">
                  <PhoneIcon size={18} className="text-gold" /> {company.phone.display}
                </a>
              </li>
              <li>
                <a href={mailHref} className="group flex items-center gap-3 break-all text-ivory/90 hover:text-gold">
                  <MailIcon size={18} className="shrink-0 text-gold" /> {company.email}
                </a>
              </li>
              <li>
                <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 text-ivory/90 hover:text-gold">
                  <WhatsappIcon size={18} className="text-gold" /> WhatsApp
                </a>
              </li>
            </ul>
            <address className="mt-7 not-italic text-sm leading-relaxed text-mist">
              <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-ivory/50">Geschäftsanschrift</span>
              {company.legalName}
              <br />
              {company.address.street}
              <br />
              {company.address.postalCode} {company.address.city}
            </address>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/[0.06] pt-7 text-xs text-mist md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {company.legalName} · Inhaber {company.owner}
          </p>
          <ul className="flex gap-6">
            <li>
              <Link href="/impressum" className="link-lux hover:text-ivory">
                Impressum
              </Link>
            </li>
            <li>
              <Link href="/datenschutz" className="link-lux hover:text-ivory">
                Datenschutz
              </Link>
            </li>
            <li>
              <Link href="/bildnachweise" className="link-lux hover:text-ivory">
                Bildnachweise
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
