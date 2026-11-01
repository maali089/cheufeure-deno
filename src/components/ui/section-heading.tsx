import type { ReactNode } from "react";
import { Reveal } from "./reveal";

export function SectionHeading({ eyebrow, title, intro, id, align = "left" }: { eyebrow: string; title: ReactNode; intro?: ReactNode; id?: string; align?: "left" | "center" }) {
  const center = align === "center";
  return (
    <Reveal className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className={`eyebrow mb-6 flex items-center gap-4 ${center ? "justify-center" : ""}`}>
        <span className="gold-rule w-10" aria-hidden />
        {eyebrow}
      </p>
      <h2 id={id} className="display text-[2.4rem] leading-[1.06] sm:text-5xl lg:text-[3.6rem]">
        {title}
      </h2>
      {intro && <p className={`mt-6 text-base leading-relaxed text-ivory/70 md:text-lg ${center ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>{intro}</p>}
    </Reveal>
  );
}
