import Image from "next/image";
import Link from "next/link";
import { BookVehicleButton } from "@/components/fleet/book-vehicle-button";
import { vehicleImages } from "@/components/fleet/vehicle-images";
import { ArrowRightIcon, CheckIcon, SuitcaseIcon, UsersIcon } from "@/components/icons";
import { PreselectLink } from "@/components/ui/preselect";
import { Reveal, ShadowReveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { FleetEntry } from "@/lib/server/fleet-settings";

export function Fleet({ fleet }: { fleet: FleetEntry[] }) {
  const allConfirmed = fleet.every((v) => v.confirmed);
  const classes = fleet.filter((v) => v.group === "class");
  const alternatives = fleet.filter((v) => v.group === "alternative");
  return (
    <section id="flotte" aria-labelledby="flotte-title" className="relative overflow-hidden bg-coal py-28 md:py-40">
      <div aria-hidden className="pointer-events-none absolute -right-40 top-20 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(198,166,107,0.06),transparent_65%)]" />
      <div className="container-lux">
        <SectionHeading
          id="flotte-title"
          eyebrow="Fahrzeugflotte"
          title={
            <>
              Drei Klassen. <em className="font-light italic text-gold">Ein Anspruch.</em>
            </>
          }
          intro="Wählen Sie die Fahrzeugklasse, die zu Ihrer Fahrt passt – vom souveränen Business-Fahrzeug bis zum geräumigen Van."
        />
        {!allConfirmed && (
          <Reveal delay={0.1}>
            <p className="mt-8 inline-flex items-start gap-3 border border-gold/25 bg-gold/[0.04] px-4 py-3 text-xs leading-relaxed text-ivory/70">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
              Vorgeschlagene Flottenkonfiguration. Die Verfügbarkeit der jeweiligen Fahrzeugklasse wird mit Ihrer Anfrage geprüft und persönlich bestätigt.
            </p>
          </Reveal>
        )}

        <div className="mt-20 space-y-24 md:space-y-36">
          {classes.map((v, i) => {
            const reverse = i % 2 === 1;
            return (
              <article key={v.slug} aria-labelledby={`fleet-${v.slug}`} className="grid items-center gap-10 md:grid-cols-12 md:gap-14">
                <ShadowReveal className={`relative md:col-span-7 ${reverse ? "md:order-2" : ""}`}>
                  <div className="relative aspect-[16/10] overflow-hidden bg-ink">
                    <Image src={vehicleImages[v.slug]} alt={v.imageAlt} fill placeholder="blur" sizes="(min-width: 768px) 58vw, 100vw" className={`object-cover ${v.imagePosition}`} />
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
                    {(v.imageNote || v.imageCredit) && (
                      <span className="absolute bottom-3 right-3 bg-ink/70 px-2 py-1 text-[0.58rem] tracking-[0.08em] text-ivory/60 backdrop-blur">
                        {v.imageNote && <span className="uppercase tracking-[0.18em]">{v.imageNote}</span>}
                        {v.imageNote && v.imageCredit && " · "}
                        {v.imageCredit && (
                          <Link href="/bildnachweise" className="hover:text-gold">
                            {v.imageCredit}
                          </Link>
                        )}
                      </span>
                    )}
                  </div>
                </ShadowReveal>

                <Reveal delay={0.1} className={`md:col-span-5 ${reverse ? "md:order-1" : ""}`}>
                  <p className="eyebrow">{v.category}</p>
                  <h3 id={`fleet-${v.slug}`} className="display mt-4 text-[2.2rem] md:text-[2.8rem]">
                    {v.model}
                  </h3>
                  <p className="mt-5 max-w-md leading-relaxed text-ivory/70">{v.tagline}</p>

                  <dl className="mt-8 grid grid-cols-2 border-y border-white/[0.08]">
                    <div className="flex items-center gap-3 py-5">
                      <UsersIcon size={22} className="text-gold" />
                      <div>
                        <dt className="text-[0.62rem] uppercase tracking-[0.2em] text-mist">Fahrgäste</dt>
                        <dd className="mt-0.5 text-lg">bis {v.passengers}</dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 border-l border-white/[0.08] py-5 pl-5">
                      <SuitcaseIcon size={22} className="text-gold" />
                      <div>
                        <dt className="text-[0.62rem] uppercase tracking-[0.2em] text-mist">Gepäck</dt>
                        <dd className="mt-0.5 text-lg">bis {v.luggage} Koffer</dd>
                      </div>
                    </div>
                  </dl>
                  <p className="mt-6 text-[0.62rem] uppercase tracking-[0.2em] text-mist">Typische Merkmale der Klasse</p>
                  <ul className="mt-3 space-y-2.5 text-sm text-ivory/80">
                    {v.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-3">
                        <CheckIcon size={16} className="text-gold" /> {feat}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 text-xs text-mist">Richtwerte – die genaue Ausstattung wird mit Ihrer Anfrage abgestimmt.</p>

                  {v.enabled ? (
                    <PreselectLink detail={{ vehicleClass: v.slug }} ariaLabel={`${v.model} anfragen`} className="btn btn-ghost mt-9">
                      Diese Klasse anfragen <ArrowRightIcon size={16} />
                    </PreselectLink>
                  ) : (
                    <p className="mt-9 text-sm text-mist">Derzeit nicht online anfragbar – bitte kontaktieren Sie uns direkt.</p>
                  )}
                </Reveal>
              </article>
            );
          })}
        </div>

        {alternatives.length > 0 && (
          <div className="mt-28 md:mt-40">
            <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow mb-5 flex items-center gap-4">
                  <span className="gold-rule w-10" aria-hidden /> Weitere Limousinen der First Class
                </p>
                <h3 className="display text-[2rem] md:text-[2.6rem]">
                  Ebenso <em className="font-light italic text-gold">exklusiv.</em>
                </h3>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-mist">
                Ebenfalls anfragbar: Oberklasse-Limousinen von BMW und Audi – mit demselben Anspruch an Komfort, Ruhe und Diskretion.
              </p>
            </Reveal>

            <ul className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
              {alternatives.map((v, i) => (
                <Reveal as="li" key={v.slug} delay={i * 0.1} className="group relative flex flex-col overflow-hidden border border-white/[0.07] bg-ink/60 transition-colors duration-700 hover:border-gold/30">
                  <article aria-labelledby={`fleet-${v.slug}`} className="flex h-full flex-col">
                    <div className="relative aspect-[16/10] overflow-hidden bg-ink">
                      <Image
                        src={vehicleImages[v.slug]}
                        alt={v.imageAlt}
                        fill
                        placeholder="blur"
                        sizes="(min-width: 768px) 45vw, 100vw"
                        className={`object-cover transition-transform duration-[1.6s] ease-[var(--ease-lux)] group-hover:scale-[1.035] ${v.imagePosition}`}
                      />
                      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                      <span className="absolute bottom-3 right-3 bg-ink/70 px-2 py-1 text-[0.58rem] tracking-[0.08em] text-ivory/60 backdrop-blur">
                        {v.imageNote && <span className="uppercase tracking-[0.18em]">{v.imageNote}</span>}
                        {v.imageNote && v.imageCredit && " · "}
                        {v.imageCredit && (
                          <Link href="/bildnachweise" className="hover:text-gold">
                            {v.imageCredit}
                          </Link>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-7 md:p-9">
                      <span aria-hidden className="block h-px w-10 bg-gold transition-[width] duration-700 ease-[var(--ease-lux)] group-hover:w-20" />
                      <p className="eyebrow mt-6">{v.category}</p>
                      <h4 id={`fleet-${v.slug}`} className="display mt-3 text-[2rem] md:text-[2.3rem]">
                        {v.model}
                      </h4>
                      <p className="mt-4 max-w-md leading-relaxed text-ivory/70">{v.tagline}</p>
                      <div className="mt-6 flex gap-8 text-sm text-ivory/80">
                        <span className="flex items-center gap-2.5">
                          <UsersIcon size={18} className="text-gold" /> bis {v.passengers} Fahrgäste
                        </span>
                        <span className="flex items-center gap-2.5">
                          <SuitcaseIcon size={18} className="text-gold" /> bis {v.luggage} Koffer
                        </span>
                      </div>
                      <div className="mt-auto pt-8">
                        {v.enabled ? (
                          <BookVehicleButton slug={v.slug} model={v.model} />
                        ) : (
                          <p className="text-sm text-mist">Derzeit nicht online anfragbar – bitte kontaktieren Sie uns direkt.</p>
                        )}
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
