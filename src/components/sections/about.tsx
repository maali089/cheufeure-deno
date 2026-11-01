import Image from "next/image";
import Link from "next/link";
import aboutImage from "@/assets/images/about.jpg";
import { Reveal, ShadowReveal } from "@/components/ui/reveal";
import { company } from "@/config/company";

export function About() {
  return (
    <section id="ueber-uns" aria-labelledby="ueber-uns-title" className="relative overflow-hidden bg-coal py-28 md:py-40">
      <div className="container-lux grid items-center gap-14 md:grid-cols-12 md:gap-16">
        <ShadowReveal className="relative md:col-span-6">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={aboutImage}
              alt="Schwarze Mercedes-Benz V-Klasse der aktuellen Generation, schräg von vorne fotografiert"
              fill
              placeholder="blur"
              sizes="(min-width: 768px) 48vw, 100vw"
              className="object-cover object-[82%_58%]"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-tr from-ink/70 via-transparent to-transparent" />
            <Link href="/bildnachweise" className="absolute bottom-3 right-3 bg-ink/70 px-2 py-1 text-[0.58rem] tracking-[0.08em] text-ivory/60 backdrop-blur hover:text-gold">
              <span className="uppercase tracking-[0.18em]">Symbolbild</span> · Foto: Alexander Migl, CC BY-SA 4.0 (bearb.)
            </Link>
          </div>
          <div aria-hidden className="absolute -bottom-6 -right-6 hidden h-40 w-40 border border-gold/30 md:block" />
        </ShadowReveal>

        <div className="md:col-span-6">
          <Reveal>
            <p className="eyebrow mb-6 flex items-center gap-4">
              <span className="gold-rule w-10" aria-hidden /> Über uns
            </p>
            <h2 id="ueber-uns-title" className="display text-[2.4rem] sm:text-5xl lg:text-[3.4rem]">
              Persönlich. Diskret. <em className="font-light italic text-gold">Mit Anspruch.</em>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 space-y-5 text-[1.02rem] leading-relaxed text-ivory/75">
              <p>
                DEENO ist ein Chauffeur- und Limousinenservice mit Sitz in {company.address.city}. Inhaber {company.owner} steht für einen Service, bei dem Sie als
                Fahrgast im Mittelpunkt stehen – von der ersten Anfrage bis zur Ankunft am Ziel.
              </p>
              <p>
                Diskretion ist für uns selbstverständlich. Jede Fahrt wird individuell geplant und an Ihrem Zeitplan und Ihren Wünschen ausgerichtet.
              </p>
              <p>Unser Anspruch ist ein ruhiges, komfortables Reiseerlebnis – ob Geschäftstermin, Flughafentransfer oder ein besonderer Anlass.</p>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-10 flex items-center gap-5 border-t border-white/[0.08] pt-8">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 font-display text-xl text-gold" aria-hidden>
                WD
              </span>
              <div>
                <p className="font-display text-2xl">{company.owner}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-mist">Inhaber · Ihr persönlicher Ansprechpartner</p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
