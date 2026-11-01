import Image, { type StaticImageData } from "next/image";
import airport from "@/assets/images/airport.jpg";
import business from "@/assets/images/business.jpg";
import hourly from "@/assets/images/hourly.jpg";
import vip from "@/assets/images/vip.jpg";
import wedding from "@/assets/images/wedding.jpg";
import { ArrowRightIcon } from "@/components/icons";
import { PreselectLink } from "@/components/ui/preselect";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { services, type ServiceKey } from "@/config/content";

const images: Record<ServiceKey, StaticImageData> = { airport, business, vip, event: wedding, hourly };
const layout: Record<ServiceKey, string> = {
  airport: "md:col-span-7 md:row-span-2 min-h-[26rem] md:min-h-[38rem]",
  business: "md:col-span-5 min-h-[22rem]",
  vip: "md:col-span-5 min-h-[22rem]",
  event: "md:col-span-6 min-h-[24rem]",
  hourly: "md:col-span-6 min-h-[24rem]",
};
const focus: Record<ServiceKey, string> = {
  airport: "object-[50%_60%]",
  business: "object-[60%_45%]",
  vip: "object-center",
  event: "object-[50%_60%]",
  hourly: "object-[50%_55%]",
};

export function Services() {
  return (
    <section id="leistungen" aria-labelledby="leistungen-title" className="relative py-28 md:py-40">
      <div className="container-lux">
        <div className="mb-16 flex flex-col gap-8 md:mb-20 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            id="leistungen-title"
            eyebrow="Unsere Leistungen"
            title={
              <>
                Für jeden Anlass die <em className="font-light italic text-gold">passende</em> Fahrt.
              </>
            }
          />
          <Reveal delay={0.15} className="max-w-sm text-sm leading-relaxed text-mist">
            Jede Fahrt wird individuell angefragt und persönlich bestätigt. So erhalten Sie genau die Leistung, die zu Ihrem Termin passt.
          </Reveal>
        </div>

        <ul className="grid gap-4 md:grid-cols-12 md:gap-5">
          {services.map((s, i) => (
            <Reveal as="li" key={s.key} delay={(i % 3) * 0.08} className={`group relative isolate flex overflow-hidden bg-graphite ${layout[s.key]}`}>
              <Image
                src={images[s.key]}
                alt={s.imageAlt}
                fill
                placeholder="blur"
                sizes={s.key === "airport" ? "(min-width: 768px) 58vw, 100vw" : "(min-width: 768px) 45vw, 100vw"}
                className={`-z-10 object-cover transition-transform duration-[1.8s] ease-[var(--ease-lux)] group-hover:scale-[1.045] ${focus[s.key]}`}
              />
              <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/55 to-ink/5 transition-opacity duration-700 group-hover:opacity-90" />
              <div className="mt-auto w-full p-7 md:p-9">
                <span className="font-sans text-[0.65rem] tracking-[0.3em] text-gold">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="display mt-3 text-[1.85rem] md:text-[2.2rem]">{s.title}</h3>
                <span aria-hidden className="mt-5 block h-px w-10 bg-gold transition-[width] duration-700 ease-[var(--ease-lux)] group-hover:w-20" />
                <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-ivory/75">{s.description}</p>
                <PreselectLink
                  detail={{ tripType: s.tripType }}
                  ariaLabel={`${s.title} anfragen`}
                  className="mt-7 inline-flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-ivory transition-colors hover:text-gold"
                >
                  Fahrt anfragen
                  <ArrowRightIcon size={16} className="transition-transform duration-500 group-hover:translate-x-1" />
                </PreselectLink>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
