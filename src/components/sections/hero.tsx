import Image from "next/image";
import Link from "next/link";
import heroImage from "@/assets/images/hero.jpg";
import { ArrowRightIcon, PhoneIcon } from "@/components/icons";
import { company, telHref } from "@/config/company";

export function Hero() {
  return (
    <section id="start" aria-labelledby="hero-title" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink">
      {/* Bild */}
      <div className="absolute inset-x-0 top-0 h-[64svh] overflow-hidden md:inset-0 md:h-auto">
        <div className="hero-car absolute inset-0 will-change-transform">
          <Image
            src={heroImage}
            alt="Schwarze Mercedes-Benz S-Klasse bei Nacht vor einem beleuchteten Gebäude, Seitenansicht"
            fill
            priority
            fetchPriority="high"
            quality={80}
            placeholder="blur"
            sizes="100vw"
            className="object-cover object-[80%_62%] md:object-[74%_55%]"
          />
        </div>
        {/* Lichtakzente */}
        <div aria-hidden className="hero-glow pointer-events-none absolute right-[8%] top-[52%] h-[38vh] w-[38vh] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(198,166,107,0.22),transparent_65%)] mix-blend-screen md:right-[12%] md:top-[60%]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="hero-sweep absolute -inset-y-1/4 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(245,242,236,0.07),transparent)]" />
        </div>
        {/* Verläufe für Lesbarkeit */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/40 md:bg-[linear-gradient(90deg,rgba(9,9,9,0.94)_0%,rgba(9,9,9,0.72)_34%,rgba(9,9,9,0.12)_64%,rgba(9,9,9,0.25)_100%)]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
      </div>
      <div aria-hidden className="hero-veil pointer-events-none absolute inset-0 z-10 bg-ink" />

      {/* Inhalt */}
      <div className="container-lux relative z-20 mt-auto flex flex-1 flex-col justify-end pb-24 pt-[52svh] md:justify-center md:pb-16 md:pt-32">
        <div className="max-w-[40rem]">
          <p className="hero-rise eyebrow mb-6 flex items-center gap-4" style={{ animationDelay: "1s" }}>
            <span className="hero-line gold-rule w-10" aria-hidden />
            Chauffeur- &amp; Limousinenservice
          </p>
          <h1 id="hero-title" className="display hero-rise text-[2.75rem] xs:text-[3.1rem] sm:text-6xl lg:text-[5.4rem]" style={{ animationDelay: "1.1s" }}>
            Exklusivität beginnt mit <em className="font-light italic text-gold">Ihrer Fahrt.</em>
          </h1>
          <p className="hero-rise mt-7 max-w-[34rem] text-[1.02rem] leading-relaxed text-ivory/75 md:text-lg" style={{ animationDelay: "1.6s" }}>
            Erleben Sie erstklassigen Chauffeur- und Limousinenservice mit höchstem Anspruch an Komfort, Diskretion und Zuverlässigkeit.
          </p>
          <div className="hero-rise mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4" style={{ animationDelay: "1.85s" }}>
            <Link href="/#buchen" className="btn btn-gold">
              Jetzt Fahrt anfragen <ArrowRightIcon size={18} />
            </Link>
            <Link href="/#leistungen" className="btn btn-ghost">
              Unsere Leistungen entdecken
            </Link>
          </div>
        </div>
      </div>

      <div className="hero-rise container-lux relative z-20 hidden pb-10 md:flex md:items-end md:justify-between" style={{ animationDelay: "2.2s" }}>
        <a href={telHref} className="flex items-center gap-3 text-sm text-ivory/70 transition-colors hover:text-gold">
          <PhoneIcon size={17} className="text-gold" />
          Persönlich erreichbar: {company.phone.display}
        </a>

      </div>
    </section>
  );
}
