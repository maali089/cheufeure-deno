import Link from "next/link";

export function BrandMark({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`flex flex-col items-start leading-none ${className}`}>
      <span className={`font-display font-normal text-ivory ${compact ? "text-[1.55rem] tracking-[0.36em]" : "text-[1.9rem] tracking-[0.42em]"}`}>DEENO</span>
      <span className="mt-1.5 flex items-center gap-2">
        <span className="h-px w-4 bg-gold" aria-hidden />
        <span className={`whitespace-nowrap font-sans font-medium uppercase text-gold ${compact ? "text-[0.5rem] tracking-[0.26em]" : "text-[0.56rem] tracking-[0.3em]"} max-[359px]:tracking-[0.14em]`}>
          Chauffeur- &amp; Limousinenservice
        </span>
      </span>
    </span>
  );
}

export function BrandLink({ compact }: { compact?: boolean }) {
  return (
    <Link href="/#start" className="group inline-flex" aria-label="DEENO Chauffeur- und Limousinenservice – zur Startseite">
      <BrandMark compact={compact} />
    </Link>
  );
}
