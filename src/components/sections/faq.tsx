import { PlusIcon } from "@/components/icons";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { faqs } from "@/config/content";

/** Aufklappbarer FAQ-Bereich auf Basis von <details> – funktioniert auch ohne JavaScript. */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative py-28 md:py-40">
      <div className="container-lux grid gap-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <SectionHeading
            id="faq-title"
            eyebrow="Häufige Fragen"
            title={
              <>
                Gut zu <em className="font-light italic text-gold">wissen.</em>
              </>
            }
            intro="Ihre Frage ist nicht dabei? Wir beantworten sie gern persönlich."
          />
        </div>
        <Reveal className="md:col-span-8" delay={0.1}>
          <div className="border-t border-white/[0.08]">
            {faqs.map((f, i) => (
              <details key={f.q} name="faq" className="faq-item group border-b border-white/[0.08]" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-[1.35rem] leading-snug text-ivory transition-colors duration-500 group-hover:text-gold md:text-[1.6rem]">{f.q}</span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-gold transition-all duration-500 group-open:rotate-45 group-open:border-gold">
                    <PlusIcon size={18} />
                  </span>
                </summary>
                <div className="faq-content">
                  <p className="max-w-2xl pb-7 pr-14 leading-relaxed text-ivory/70">{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
