"use client";

import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useRef, useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { STATIC_P, computeFrame, paxTransform, type Frame } from "./engine";
import { SceneActors, SceneBackground, poseAttributes } from "./scene-art";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const scenes = [
  { no: "01", title: "Die Ankunft", text: "Ihre S-Klasse fährt vor – ruhig und zur vereinbarten Zeit." },
  { no: "02", title: "Der Einstieg", text: "Die Tür öffnet sich. Sie nehmen Platz, ganz ohne Eile." },
  { no: "03", title: "Die Abfahrt", text: "Sanft setzt sich die Limousine in Bewegung. Ihre Reise beginnt." },
]

const initialFrame = computeFrame(STATIC_P);

/** Sichtbarer Ausschnitt: immer genug Breite für Fahrzeug + Fahrgast, auch im Hochformat. */
function viewBoxFor(w: number, h: number) {
  const a = Math.max(0.3, w / Math.max(1, h));
  const vbW = Math.max(a < 0.9 ? 860 : 1040, 820 * a);
  const vbH = vbW / a;
  const ground = a < 0.9 ? 0.67 : a < 1.3 ? 0.7 : 0.74;
  return `${(-vbW / 2).toFixed(1)} ${(-vbH * ground).toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`;
}

type Els = Record<string, Element | undefined>;

export function ChauffeurStory() {
  const stageRef = useRef<HTMLDivElement>(null);
  const elsRef = useRef<Els>({});
  const lastRef = useRef<Map<string, string>>(new Map());
  const [mode, setMode] = useState<"static" | "motion" | "reduced">("static");

  const set = useCallback((key: string, attr: string, value: string | number) => {
    const el = elsRef.current[key];
    if (!el) return;
    const v = String(value);
    const cacheKey = `${key}|${attr}`;
    if (lastRef.current.get(cacheKey) === v) return;
    lastRef.current.set(cacheKey, v);
    if (attr === "style.opacity") (el as HTMLElement).style.opacity = v;
    else if (attr === "style.transform") (el as HTMLElement).style.transform = v;
    else el.setAttribute(attr, v);
  }, []);

  const apply = useCallback(
    (f: Frame) => {
      set("far", "transform", `translate(${f.layers.far} 0)`);
      set("mid", "transform", `translate(${f.layers.mid} 0)`);
      set("near", "transform", `translate(${f.layers.near} 0)`);
      set("actors", "transform", `translate(${f.layers.near} 0)`);

      set("car", "transform", `translate(${f.car.x} 0)`);
      set("carDoor", "transform", `translate(${f.car.x} 0)`);
      set("wheelF", "transform", `rotate(${f.car.wheel})`);
      set("wheelR", "transform", `rotate(${f.car.wheel})`);
      const blur = (f.car.reflectOpacity * 0.45).toFixed(2);
      set("blurF", "opacity", blur);
      set("blurR", "opacity", blur);
      set("brake", "opacity", (0.3 + f.car.brake * 0.7).toFixed(2));
      set("reflect", "x", f.car.reflectX);
      set("reflect", "opacity", f.car.reflectOpacity);
      set("ambient", "opacity", f.door.open);

      set("doorInner", "d", f.door.inner);
      set("doorOuter", "d", f.door.outer);
      set("doorShade", "d", f.door.outer);
      set("doorShade", "opacity", f.door.shade);
      set("doorGlass", "d", f.door.glass);
      set("doorGlassEdge", "d", f.door.glass);
      set("doorTrim", "d", f.door.trim);
      set("doorBelt", "d", f.door.belt);
      set("doorHandle", "d", f.door.handle);

      const t = paxTransform(f.pax.x, f.pax.y, f.pax.sx, f.pax.sy);
      set("paxBehind", "transform", t);
      set("paxFront", "transform", t);
      set("paxInside", "transform", paxTransform(f.pax.x - f.car.x, f.pax.y, f.pax.sx, f.pax.sy));
      set("paxBehind", "opacity", f.pax.behind);
      set("paxFront", "opacity", f.pax.front);
      set("paxInside", "opacity", f.pax.inside);
      set("watch", "opacity", f.pax.watchGlint);
      const pose = poseAttributes(f);
      for (const k in pose) set(k, "transform", pose[k]!);

      for (let i = 0; i < scenes.length; i++) {
        const active = i === f.caption;
        set(`cap${i}`, "style.opacity", active ? f.captionOpacity : 0);
        set(`cap${i}`, "style.transform", active ? "translate3d(0,0,0)" : i < f.caption ? "translate3d(0,-14px,0)" : "translate3d(0,14px,0)");
        set(`seg${i}`, "style.transform", `scaleX(${Math.min(1, Math.max(0, f.progress * scenes.length - i)).toFixed(3)})`);
      }
      set("hint", "style.opacity", Math.max(0, 1 - f.progress * 28).toFixed(2));
      set("finale", "style.opacity", f.finale);
      set("finale", "style.transform", `translate3d(0, ${((1 - f.finale) * 24).toFixed(1)}px, 0)`);
      set("finaleVeil", "style.opacity", (f.finale * 0.62).toFixed(3));
      const fin = elsRef.current.finale as HTMLElement | undefined;
      if (fin) fin.style.pointerEvents = f.finale > 0.6 ? "auto" : "none";
      set("ui", "style.opacity", f.captionOpacity);
    },
    [set],
  );

  useGSAP(
    () => {
      const stage = stageRef.current;
      if (!stage) return;

      // Elemente einmalig erfassen
      const els: Els = {};
      stage.querySelectorAll("[data-r]").forEach((el) => {
        const k = el.getAttribute("data-r")!;
        if (!els[k]) els[k] = el;
      });
      elsRef.current = els;
      lastRef.current.clear();

      const svgs = stage.querySelectorAll<SVGSVGElement>("svg[data-layer]");
      const fit = () => {
        const vb = viewBoxFor(stage.clientWidth, stage.clientHeight);
        svgs.forEach((s) => s.setAttribute("viewBox", vb));
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(stage);

      ScrollTrigger.config({ ignoreMobileResize: true });
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        setMode("motion");
        const state = { p: 0 };
        apply(computeFrame(0));
        const tween = gsap.to(state, {
          p: 1,
          ease: "none",
          onUpdate: () => apply(computeFrame(state.p)),
          scrollTrigger: {
            trigger: stage,
            start: "top top",
            end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < 768 ? 1.8 : 2.2))}`,
            pin: true,
            scrub: 0.7,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        setMode("reduced");
        apply(computeFrame(STATIC_P));
      });

      return () => {
        ro.disconnect();
        mm.revert();
      };
    },
    { scope: stageRef, dependencies: [apply] },
  );

  const showStaticText = mode !== "motion";

  return (
    <section id="erlebnis" aria-labelledby="story-title" className="relative bg-ink">
      <div ref={stageRef} className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-ink">
        <h2 id="story-title" className="sr-only">
          Eine Fahrt mit DEENO – von der Abholung bis zur Ankunft
        </h2>
        <p className="sr-only">
          Animierte Illustration: Eine schwarze Mercedes-Benz S-Klasse fährt mit leuchtenden LED-Scheinwerfern vor einem Gebäude vor, ein Geschäftskunde steigt hinten ein,
          die Tür schließt sich und die Limousine fährt sanft nach links aus dem Bild.
        </p>

        <svg data-layer="bg" aria-hidden className="absolute inset-0 h-full w-full" viewBox="-730 -607 1460 820" preserveAspectRatio="xMidYMid slice">
          <SceneBackground f={initialFrame} />
        </svg>
        <svg data-layer="actors" aria-hidden className="absolute inset-0 h-full w-full" viewBox="-730 -607 1460 820" preserveAspectRatio="xMidYMid slice">
          <SceneActors f={initialFrame} />
        </svg>


        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_40%,rgba(9,9,9,0.75)_100%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />

        {/* Szenentexte */}
        <div data-r="ui" className="pointer-events-none absolute inset-x-0 top-0 pt-28 md:pt-32" style={{ opacity: showStaticText ? 0 : 1 }}>
          <div className="container-lux">
            <p className="eyebrow mb-5 flex items-center gap-3">
              <span className="gold-rule w-8" aria-hidden /> Eine Fahrt mit DEENO
            </p>
            <div className="relative h-36 max-w-md" aria-live="off">
              {scenes.map((s, i) => (
                <div
                  key={s.no}
                  data-r={`cap${i}`}
                  className="absolute inset-0 transition-[opacity,transform] duration-700 ease-[var(--ease-lux)]"
                  style={{ opacity: 0 }}
                >
                  <p className="font-display text-[2rem] leading-tight text-ivory md:text-[2.6rem]">
                    <span className="mr-3 font-sans text-xs tracking-[0.25em] text-gold">{s.no}</span>
                    {s.title}
                  </p>
                  <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-ivory/70">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fortschritt */}
        <div data-r="uiBar" className="pointer-events-none absolute inset-x-0 bottom-0 pb-[max(calc(env(safe-area-inset-bottom)+5.5rem),6rem)] md:pb-8" style={{ display: showStaticText ? "none" : undefined }}>
          <div className="container-lux">
            <p data-r="hint" className="mb-4 text-center text-[0.65rem] uppercase tracking-[0.3em] text-ivory/55">
              Scrollen Sie, um die Fahrt zu erleben
            </p>
            <ol className="grid grid-cols-3 gap-2 md:gap-4">
              {scenes.map((s, i) => (
                <li key={s.no} className="min-w-0">
                  <span className="block h-px w-full bg-white/15">
                    <span data-r={`seg${i}`} className="block h-px w-full origin-left bg-gold" style={{ transform: "scaleX(0)" }} />
                  </span>
                  <span className="mt-2 hidden truncate text-[0.62rem] uppercase tracking-[0.2em] text-ivory/50 sm:block">{s.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Szene 5 – Übergang zum Buchungsbereich */}
        <div data-r="finaleVeil" aria-hidden className="pointer-events-none absolute inset-0 bg-ink" style={{ opacity: showStaticText ? 0.62 : 0 }} />
        <div
          data-r="finale"
          className="absolute inset-0 flex items-center justify-center px-5 text-center"
          style={{ opacity: showStaticText ? 1 : 0, pointerEvents: showStaticText ? "auto" : "none" }}
        >
          <div className="max-w-2xl">
            <span className="gold-rule mx-auto mb-8" aria-hidden />
            <p className="display text-[2.6rem] sm:text-6xl md:text-7xl">
              Ihre Reise. <em className="font-light italic text-gold">Unser Anspruch.</em>
            </p>
            <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-ivory/75 md:text-lg">
              Ihr persönlicher Chauffeur-Service – komfortabel, diskret und individuell.
            </p>
            {showStaticText && (
              <ol className="mx-auto mt-8 grid max-w-lg gap-2 text-left text-sm text-ivory/70">
                {scenes.map((s) => (
                  <li key={s.no} className="border-l border-gold/40 pl-3">
                    <span className="text-gold">{s.no}</span> {s.title} – {s.text}
                  </li>
                ))}
              </ol>
            )}
            <Link href="/#buchen" className="btn btn-gold mt-10">
              Jetzt Ihre Fahrt anfragen <ArrowRightIcon size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
