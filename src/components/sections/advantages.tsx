import { ComfortIcon, DiscretionIcon, FlexibleIcon, PersonalIcon } from "@/components/icons";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { advantages } from "@/config/content";

const icons = { discretion: DiscretionIcon, comfort: ComfortIcon, personal: PersonalIcon, flexible: FlexibleIcon } as const;

export function Advantages() {
  return (
    <section id="vorteile" aria-labelledby="vorteile-title" className="relative py-28 md:py-40">
      <div className="container-lux">
        <SectionHeading
          id="vorteile-title"
          eyebrow="Warum DEENO?"
          align="center"
          title={
            <>
              Worauf Sie sich <em className="font-light italic text-gold">verlassen</em> können.
            </>
          }
        />
        <ul className="mt-20 grid border-t border-white/[0.08] sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map((a, i) => {
            const Icon = icons[a.key];
            return (
              <Reveal
                as="li"
                key={a.key}
                delay={i * 0.1}
                className="group relative border-b border-white/[0.08] px-2 py-12 sm:px-8 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:[&:not(:last-child)]:border-r"
              >
                <span aria-hidden className="absolute left-0 top-0 h-px w-0 bg-gold transition-[width] duration-1000 ease-[var(--ease-lux)] group-hover:w-full" />
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 text-gold transition-colors duration-700 group-hover:border-gold">
                  <Icon size={24} />
                </span>
                <h3 className="display mt-8 text-[1.75rem]">{a.title}</h3>
                <p className="mt-4 leading-relaxed text-ivory/65">{a.text}</p>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
