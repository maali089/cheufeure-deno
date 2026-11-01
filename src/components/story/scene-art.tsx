/**
 * Eigens erstellte SVG-Illustrationen für die Chauffeur-Story (keine Fremdgrafiken).
 * Fahrzeug: Mercedes-Benz S-Klasse (W223) – Kontur exakt nach einer 90°-Seitenansicht vermessen
 * (car-geometry.ts), Darstellung als eigene Vektorgrafik ohne Markenlogo. Alle Gradienten, keine Filter → performant auf Mobilgeräten.
 */
import {
  BODY_OUTLINE,
  B_PILLAR,
  DLO_CABIN,
  DLO_FRAME,
  DOOR_FRONT_EDGE,
  DOOR_SPLIT,
  DRL,
  FRONT_GLASS,
  FRONT_HANDLE,
  GEO,
  GRILLE_EDGE,
  HEADLIGHT,
  HOOD_LINE,
  LOWER_CHROME,
  MIRROR,
  ROOFLINE,
  SHOULDER,
  SILL,
  SWEEP,
  TAILLIGHT,
  TAIL_LED,
} from "./car-geometry";
import { APERTURE_PATH, CAR, JOINTS, PAX_WAIT_X, WORLD, type Frame, paxTransform, rot } from "./engine";

/* ───────────── Pseudozufall (deterministisch) ───────────── */
function prng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GOLD = "#C6A66B";
const BASE = -44; // Gebäudesockel (hinterer Gehweg)

/* ───────────── Fahrzeug-Pfade (lokal) ───────────── */

const BODY_WITH_HOLES = `${BODY_OUTLINE}${FRONT_GLASS}${APERTURE_PATH}`;

/* ───────────── Defs ───────────── */

function Defs({ a }: { a: Record<string, string> }) {
  return (
    <defs>
      <linearGradient id="st-sky" x1="0" y1="-1400" x2="0" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#050505" />
        <stop offset="0.55" stopColor="#0b0b0b" />
        <stop offset="0.86" stopColor="#15130f" />
        <stop offset="1" stopColor="#1d1914" />
      </linearGradient>
      <radialGradient id="st-horizon" cx="0" cy="0" r="1" gradientUnits="objectBoundingBox" fx="0.5" fy="1">
        <stop offset="0" stopColor={GOLD} stopOpacity="0.12" />
        <stop offset="1" stopColor={GOLD} stopOpacity="0" />
      </radialGradient>
      <linearGradient id="st-road" x1="0" y1="-26" x2="0" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#111111" />
        <stop offset="1" stopColor="#0a0a0a" />
      </linearGradient>
      <linearGradient id="st-ground" x1="0" y1="70" x2="0" y2="900" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#0c0c0c" />
        <stop offset="1" stopColor="#050505" />
      </linearGradient>
      <linearGradient id="st-paint" x1="0" y1="-176" x2="0" y2="-12" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#3a3833" />
        <stop offset="0.08" stopColor="#1a1a19" />
        <stop offset="0.36" stopColor="#0c0c0c" />
        <stop offset="0.44" stopColor="#24231f" />
        <stop offset="0.5" stopColor="#141413" />
        <stop offset="0.72" stopColor="#070707" />
        <stop offset="0.9" stopColor="#0b0b0b" />
        <stop offset="1" stopColor="#1a1916" />
      </linearGradient>
      <linearGradient id="st-sweep" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#f4efe6" stopOpacity="0" />
        <stop offset="0.35" stopColor="#f4efe6" stopOpacity="0.16" />
        <stop offset="0.75" stopColor="#f4efe6" stopOpacity="0.08" />
        <stop offset="1" stopColor="#f4efe6" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="st-glass2" x1="0" y1="-176" x2="0" y2="-115" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#3b3a37" />
        <stop offset="0.35" stopColor="#16171a" />
        <stop offset="1" stopColor="#08090a" />
      </linearGradient>
      <linearGradient id="st-rimlight" x1="0" y1="0" x2="620" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#f4efe6" stopOpacity="0.6" />
        <stop offset="0.18" stopColor="#f4efe6" stopOpacity="0.22" />
        <stop offset="0.38" stopColor="#f4efe6" stopOpacity="0.5" />
        <stop offset="0.6" stopColor="#f4efe6" stopOpacity="0.62" />
        <stop offset="0.82" stopColor="#f4efe6" stopOpacity="0.18" />
        <stop offset="1" stopColor="#f4efe6" stopOpacity="0.4" />
      </linearGradient>
      <radialGradient id="st-pool-white" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fff6e6" stopOpacity="0.2" />
        <stop offset="1" stopColor="#fff6e6" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="st-pool-red" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ff2a1a" stopOpacity="0.22" />
        <stop offset="1" stopColor="#ff2a1a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="st-paint-sheen" x1="0" y1="0" x2="620" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.05" />
        <stop offset="0.35" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="0.7" stopColor={GOLD} stopOpacity="0.05" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="st-reflect" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff2d9" stopOpacity="0.1" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="st-glass" x1="0" y1="-175" x2="0" y2="-115" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#2a2c30" />
        <stop offset="0.45" stopColor="#101214" />
        <stop offset="1" stopColor="#060708" />
      </linearGradient>
      <linearGradient id="st-glass-streak" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.09" />
        <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="st-chrome" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#5c5c5c" />
        <stop offset="0.5" stopColor="#d9d6cf" />
        <stop offset="1" stopColor="#6a6a6a" />
      </linearGradient>
      <linearGradient id="st-cabin" x1="0" y1="-175" x2="0" y2="-110" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#0d0c0b" />
        <stop offset="1" stopColor="#040404" />
      </linearGradient>
      <linearGradient id="st-interior" x1="400" y1="0" x2="510" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#120f0c" />
        <stop offset="1" stopColor="#060505" />
      </linearGradient>
      <radialGradient id="st-rim" cx="0" cy="0" r="33" gradientUnits="userSpaceOnUse">
        <stop offset="0.25" stopColor="#161616" />
        <stop offset="0.86" stopColor="#6a6863" />
        <stop offset="1" stopColor="#232323" />
      </radialGradient>
      <linearGradient id="st-spoke" x1="0" y1="-31" x2="0" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#a8a59d" />
        <stop offset="1" stopColor="#3a3936" />
      </linearGradient>
      <radialGradient id="st-shadow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#000" stopOpacity="0.95" />
        <stop offset="0.7" stopColor="#000" stopOpacity="0.55" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="st-head-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fffaf0" stopOpacity="0.9" />
        <stop offset="0.25" stopColor="#fff2d6" stopOpacity="0.35" />
        <stop offset="1" stopColor="#fff2d6" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="st-beam" x1="0" y1="0" x2="-480" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fff4dc" stopOpacity="0.22" />
        <stop offset="1" stopColor="#fff4dc" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="st-tail-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ff3b2f" stopOpacity="0.85" />
        <stop offset="0.3" stopColor="#c0241b" stopOpacity="0.35" />
        <stop offset="1" stopColor="#c0241b" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="st-lamp" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffe9c2" stopOpacity="0.55" />
        <stop offset="0.2" stopColor={GOLD} stopOpacity="0.18" />
        <stop offset="1" stopColor={GOLD} stopOpacity="0" />
      </radialGradient>
      <linearGradient id="st-cone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe9c2" stopOpacity="0.16" />
        <stop offset="1" stopColor="#ffe9c2" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="st-lobby" x1="0" y1="-230" x2="0" y2="-44" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#1f1a12" />
        <stop offset="0.6" stopColor="#3a2e1d" />
        <stop offset="1" stopColor="#4a3a22" />
      </linearGradient>
      <linearGradient id="st-hotel-door" x1="0" y1="-250" x2="0" y2="-44" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#3b2c17" />
        <stop offset="1" stopColor="#7a5c30" />
      </linearGradient>
      <linearGradient id="st-window-warm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5a4526" />
        <stop offset="1" stopColor="#2a2013" />
      </linearGradient>
      <linearGradient id="st-coat-rim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0.6" stopColor={GOLD} stopOpacity="0" />
        <stop offset="1" stopColor={GOLD} stopOpacity="0.35" />
      </linearGradient>
      <pattern id="st-win-a" width="26" height="34" patternUnits="userSpaceOnUse">
        <rect x="6" y="8" width="12" height="18" fill="#1a1712" />
      </pattern>
      <pattern id="st-win-b" width="40" height="30" patternUnits="userSpaceOnUse">
        <rect x="4" y="6" width="32" height="16" fill="#18150f" />
      </pattern>
      <pattern id="st-fins" width="38" height="10" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="5" height="10" fill="#1a1a1a" />
      </pattern>
      <clipPath id="st-aperture">
        <path d={APERTURE_PATH} />
      </clipPath>
      <clipPath id="st-body-clip">
        <path d={BODY_OUTLINE} />
      </clipPath>

      <Wheel />
      <Passenger a={a} />
    </defs>
  );
}

/** 21"-Vielspeichenrad (W223-typisch), Maße aus der Referenz: Reifen r 40,3 – Felge r 35,2 */
function Wheel() {
  const tire = GEO.wheelR;
  const rim = GEO.rimR;
  const spokes = Array.from({ length: 20 }, (_, i) => i * 18);
  return (
    <g id="st-wheel">
      <circle r={tire} fill="#060606" />
      <circle r={tire - 1.6} fill="none" stroke="#161616" strokeWidth="1.2" />
      <circle r={rim} fill="url(#st-rim)" />
      <circle r={rim - 1.6} fill="#090909" />
      <circle r={rim * 0.62} fill="#1b1a19" />
      <circle r={rim * 0.62} fill="none" stroke="#2b2a28" strokeWidth="2.2" strokeDasharray="1.5 2.5" />
      <g data-r="spokes">
        {spokes.map((a) => (
          <path key={a} d={`M-1.1 -6.5L-1.9 ${-(rim - 2)}L0.6 ${-(rim - 1.6)}L1.2 -6.6Z`} fill="url(#st-spoke)" transform={`rotate(${a})`} />
        ))}
      </g>
      <circle r={rim - 0.6} fill="none" stroke="#bdb9b0" strokeOpacity="0.55" strokeWidth="1.1" />
      <circle r="6.5" fill="#1c1c1c" stroke="#9d9a92" strokeWidth="0.8" />
      <circle r="2" fill="#77746d" />
    </g>
  );
}

/* ───────────── Fahrgast (gegliederte Figur, Blick nach links) ───────────── */

const SKIN = "#9a7862";
const COAT = "#24252a";
const COAT_DARK = "#1b1c20";
const TROUSER = "#1b1c1f";
const TROUSER_BACK = "#131417";

function Leg({ prefix, color, a }: { prefix: "F" | "B"; color: string; a: Record<string, string> }) {
  return (
    <g data-r={`thigh${prefix}`} transform={a[`thigh${prefix}`]}>
      <path d="M-7.5 -108L8.5 -108L6.5 -56L-6 -56Z" fill={color} />
      <circle cx="0.2" cy="-56" r="6.3" fill={color} />
      <g data-r={`shin${prefix}`} transform={a[`shin${prefix}`]}>
        <path d="M-6.2 -57L6.3 -57L5 -8L-4.6 -8Z" fill={color} />
        <path d="M-4.8 -9.5L5.2 -9.5L6.2 -2.2C6.3 -0.3 5 0 3.6 0L-17.5 0C-21.2 0 -22.2 -3.4 -18.8 -5.4C-14 -7.4 -9 -8.6 -4.8 -9.5Z" fill="#0a0a0a" />
        <path d="M-17 -1.2L2 -1.2" stroke="#2a2a2a" strokeWidth="0.8" />
      </g>
    </g>
  );
}

function Arm({ prefix, color, front, a }: { prefix: "F" | "B"; color: string; front?: boolean; a: Record<string, string> }) {
  return (
    <g data-r={`arm${prefix}`} transform={a[`arm${prefix}`]}>
      <path d="M-6.5 -175L7 -175L5.6 -133L-5 -133Z" fill={color} />
      <circle cx="0.6" cy="-133" r="5.4" fill={color} />
      <g data-r={`fore${prefix}`} transform={a[`fore${prefix}`]}>
        <path d="M-5.2 -134L5.6 -134L4.3 -101L-3.8 -101Z" fill={color} />
        <path d="M-4 -102.5L4.4 -102.5L4.2 -99L-3.9 -99Z" fill="#cfc8bb" opacity={front ? 0.9 : 0.5} />
        {front && <rect data-r="watch" x="-4.2" y="-106" width="8.6" height="3.4" fill={GOLD} opacity="0" />}
        <ellipse cx="0.3" cy="-93" rx="4.4" ry="6.4" fill={SKIN} opacity={front ? 1 : 0.8} />
      </g>
    </g>
  );
}

function Passenger({ a }: { a: Record<string, string> }) {
  return (
    <g id="st-pax">
      <g data-r="bob" transform={a.bob}>
        <Leg prefix="B" color={TROUSER_BACK} a={a} />
        <g data-r="torsoBack" transform={a.torsoBack}>
          <Arm prefix="B" color={COAT_DARK} a={a} />
        </g>
        <g data-r="torsoMain" transform={a.torsoMain}>
          {/* Mantel, Oberkörper */}
          <path d="M-7 -180C-15 -177 -18 -169 -17.5 -150L-15 -104L13.5 -104L15 -150C15.6 -169 11 -178 2.5 -180Z" fill={COAT} />
          <path d="M-7 -180C-15 -177 -18 -169 -17.5 -150L-15 -104L13.5 -104L15 -150C15.6 -169 11 -178 2.5 -180Z" fill="url(#st-coat-rim)" />
          {/* Revers, Hemd, Krawatte */}
          <path d="M-8.5 -179L-2.5 -166L2 -179.5Z" fill="#ddd5c8" />
          <path d="M-3.6 -173L-2 -158L-0.8 -173Z" fill="#2c2a2f" />
          <path d="M-10 -178L-5 -160L-13 -170Z" fill={COAT_DARK} />
          <path d="M-14.5 -128L-14 -104" stroke="#2f3036" strokeWidth="1" />
          {/* Hals & Kopf */}
          <path d="M-4.5 -188L4 -188L4.5 -178L-4 -178Z" fill="#7d6150" />
          <g data-r="head" transform={a.head}>
            <path d="M10 -209C6 -215 -6 -216 -11 -209L-13 -201L-16.2 -196L-13.2 -193.6L-13.4 -189.4C-12 -185 -8 -183.4 -3 -184.2C3 -185.2 8 -190 10 -196.5C11 -201 11 -205 10 -209Z" fill={SKIN} />
            <path d="M11.2 -201.5C13.4 -212 4.6 -219 -6 -216C-11 -214 -13.4 -210.2 -12.4 -206.5C-6 -209.5 2 -208.5 6.2 -205.6C7.4 -200.6 8.4 -197.4 10 -195.4Z" fill="#16110e" />
            <ellipse cx="4.6" cy="-199.5" rx="2.4" ry="3.6" fill="#86695a" />
            <path d="M-12.6 -201.6L-10 -201.8" stroke="#3a2a22" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        </g>
        <Leg prefix="F" color={TROUSER} a={a} />
        <g data-r="skirt" transform={a.skirt}>
          <path d="M-15.5 -108L13.8 -108L15.4 -62C10 -60 -6 -59.5 -16.5 -60.5Z" fill={COAT} />
          <path d="M-1 -104L-0.5 -62" stroke="#191a1e" strokeWidth="1" />
        </g>
        <g data-r="torsoFront" transform={a.torsoFront}>
          <Arm prefix="F" color={COAT} front a={a} />
        </g>
      </g>
    </g>
  );
}

/* ───────────── Umgebung ───────────── */

function Skyline() {
  const rnd = prng(7);
  const blocks: { x: number; w: number; h: number }[] = [];
  for (let x = -1300; x < 2300; ) {
    const w = 40 + rnd() * 110;
    const h = 150 + rnd() * 260 + (rnd() > 0.85 ? 120 : 0);
    blocks.push({ x, w, h });
    x += w + rnd() * 6;
  }
  const lit: { x: number; y: number }[] = [];
  blocks.forEach((b) => {
    const n = Math.floor(rnd() * 5);
    for (let i = 0; i < n; i++) lit.push({ x: b.x + 6 + rnd() * (b.w - 12), y: BASE - 40 - rnd() * (b.h - 60) });
  });
  return (
    <g>
      {blocks.map((b, i) => (
        <rect key={i} x={b.x} y={BASE - b.h} width={b.w + 1} height={b.h} fill={i % 3 ? "#0e0e0e" : "#101010"} />
      ))}
      {/* Zwei Türme mit Hauben (Münchner Anmutung) */}
      <g fill="#111111">
        <rect x="470" y={BASE - 420} width="36" height="420" />
        <rect x="528" y={BASE - 420} width="36" height="420" />
        <path d={`M470 ${BASE - 420}C470 ${BASE - 462} 506 ${BASE - 462} 506 ${BASE - 420}Z`} />
        <path d={`M528 ${BASE - 420}C528 ${BASE - 462} 564 ${BASE - 462} 564 ${BASE - 420}Z`} />
        <rect x="485" y={BASE - 478} width="6" height="20" />
        <rect x="543" y={BASE - 478} width="6" height="20" />
        <rect x="455" y={BASE - 300} width="124" height="300" />
      </g>
      {/* Fernsehturm */}
      <g fill="#101010">
        <rect x="1446" y={BASE - 600} width="12" height="600" />
        <path d={`M1428 ${BASE - 470}L1476 ${BASE - 470}L1470 ${BASE - 440}L1434 ${BASE - 440}Z`} />
        <rect x="1450.5" y={BASE - 680} width="3" height="80" />
        <circle cx="1452" cy={BASE - 682} r="2.6" fill="#b3261e" opacity="0.8" />
      </g>
      {lit.map((l, i) => (
        <rect key={`l${i}`} x={l.x} y={l.y} width="4" height="5" fill={GOLD} opacity={0.12 + (i % 4) * 0.06} />
      ))}
    </g>
  );
}

function MidCity() {
  const rnd = prng(42);
  const items: { x: number; w: number; h: number; pat: string; lit: { x: number; y: number; w: number; h: number }[] }[] = [];
  for (let x = 1150; x < 4250; ) {
    const w = 90 + rnd() * 150;
    const h = 200 + rnd() * 300;
    const pat = rnd() > 0.5 ? "url(#st-win-a)" : "url(#st-win-b)";
    const lit = [];
    const n = 2 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) {
      const wide = pat.includes("win-b");
      lit.push({ x: x + 8 + Math.floor((rnd() * (w - 40)) / 26) * 26, y: BASE - 30 - Math.floor((rnd() * (h - 60)) / 34) * 34, w: wide ? 30 : 12, h: wide ? 15 : 18 });
    }
    items.push({ x, w, h, pat, lit });
    x += w + 10 + rnd() * 50;
  }
  return (
    <g>
      {items.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={BASE - b.h} width={b.w} height={b.h} fill="#141414" />
          <rect x={b.x + 4} y={BASE - b.h + 12} width={b.w - 8} height={b.h - 24} fill={b.pat} />
          <rect x={b.x} y={BASE - b.h} width={b.w} height="3" fill="#1d1d1d" />
          {b.lit.map((l, j) => (
            <rect key={j} x={l.x} y={l.y} width={l.w} height={l.h} fill="url(#st-window-warm)" opacity={0.55 + ((i + j) % 3) * 0.15} />
          ))}
        </g>
      ))}
    </g>
  );
}

function Lamp({ x }: { x: number }) {
  return (
    <g>
      <ellipse cx={x - 26} cy={BASE + 4} rx="80" ry="7" fill={GOLD} opacity="0.08" />
      <path d={`M${x - 38} ${-369}L${x - 20} ${-369}L${x + 50} ${BASE}L${x - 108} ${BASE}Z`} fill="url(#st-cone)" />
      <rect x={x - 2} y={-372} width="4" height={372 + BASE} fill="#1b1b1b" />
      <path d={`M${x} ${-370}L${x - 30} ${-370}`} stroke="#1b1b1b" strokeWidth="3" />
      <rect x={x - 40} y={-374} width="22" height="5" fill="#222" />
      <rect x={x - 38} y={-369} width="18" height="1.6" fill="#ffe7bd" />
      <circle cx={x - 29} cy={-366} r="70" fill="url(#st-lamp)" />
      <ellipse cx={x - 26} cy={6} rx="36" ry="3" fill="#ffe9c2" opacity="0.05" />
    </g>
  );
}

function Tree({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${BASE}) scale(${s})`} fill="#0c0d0c">
      <rect x="-3" y="-120" width="6" height="120" />
      <ellipse cx="0" cy="-170" rx="58" ry="62" />
      <ellipse cx="-34" cy="-140" rx="40" ry="36" />
      <ellipse cx="36" cy="-146" rx="42" ry="38" />
      <ellipse cx="6" cy="-214" rx="38" ry="30" fill="#0e0f0e" />
    </g>
  );
}

function PickupBuilding() {
  const x0 = WORLD.X1 + 180;
  const x1 = WORLD.X1 + 1300;
  const door = PAX_WAIT_X;
  return (
    <g>
      <rect x={x0} y={BASE - 640} width={x1 - x0} height="640" fill="#121212" />
      <rect x={x0} y={BASE - 620} width={x1 - x0} height="380" fill="url(#st-fins)" />
      {[
        [x0 + 120, -420],
        [x0 + 310, -500],
        [x0 + 460, -380],
        [x0 + 690, -460],
        [x0 + 880, -540],
      ].map(([wx, wy], i) => (
        <rect key={i} x={wx} y={wy} width="33" height="46" fill="url(#st-window-warm)" opacity={0.5 + (i % 2) * 0.25} />
      ))}
      <rect x={x0} y={BASE - 242} width={x1 - x0} height="4" fill="#191919" />
      {/* Glas-Lobby */}
      <rect x={x0 + 330} y={BASE - 210} width="760" height="210" fill="url(#st-lobby)" />
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} x={x0 + 330 + i * 63} y={BASE - 210} width="3.5" height="210" fill="#0b0b0b" />
      ))}
      <rect x={x0 + 330} y={BASE - 120} width="760" height="2" fill="#0b0b0b" opacity="0.7" />
      {[x0 + 420, x0 + 560, x0 + 860, x0 + 1000].map((lx, i) => (
        <g key={i}>
          <rect x={lx} y={BASE - 210} width="1" height="60" fill="#3a3020" />
          <circle cx={lx + 0.5} cy={BASE - 148} r="5" fill="#ffe3b0" opacity="0.9" />
          <circle cx={lx + 0.5} cy={BASE - 148} r="40" fill="url(#st-lamp)" />
        </g>
      ))}
      <rect x={x0 + 600} y={BASE - 64} width="140" height="64" fill="#15110b" opacity="0.9" />
      {/* Eingang */}
      <rect x={door - 52} y={BASE - 170} width="104" height="170" fill="#5c4628" opacity="0.65" />
      <rect x={door - 1.5} y={BASE - 170} width="3" height="170" fill="#0b0b0b" />
      <rect x={door - 52} y={BASE - 170} width="104" height="3" fill="#0b0b0b" />
      {/* Vordach */}
      <rect x={door - 230} y={BASE - 262} width="460" height="14" fill="#0d0d0d" />
      <rect x={door - 230} y={BASE - 249} width="460" height="1.2" fill={GOLD} opacity="0.7" />
      {[-150, 0, 150].map((dx) => (
        <g key={dx}>
          <rect x={door + dx - 6} y={BASE - 248} width="12" height="2" fill="#ffe7bd" />
          <path d={`M${door + dx - 6} ${BASE - 246}L${door + dx + 6} ${BASE - 246}L${door + dx + 46} ${BASE}L${door + dx - 46} ${BASE}Z`} fill="url(#st-cone)" />
          <ellipse cx={door + dx} cy={BASE + 4} rx="60" ry="5" fill={GOLD} opacity="0.1" />
        </g>
      ))}
      {/* Pflanzkübel */}
      {[door - 190, door + 150].map((px) => (
        <g key={px}>
          <rect x={px} y={BASE - 46} width="40" height="46" fill="#161616" />
          <ellipse cx={px + 20} cy={BASE - 70} rx="26" ry="30" fill="#0f100f" />
        </g>
      ))}
    </g>
  );
}

function Street() {
  const dashes = [];
  for (let x = -2600; x < 10400; x += 150) dashes.push(x);
  return (
    <g>
      <rect x="-3000" y={BASE} width="14000" height="18" fill="#141414" />
      <rect x="-3000" y="-27" width="14000" height="1.5" fill="#262626" />
      <rect x="-3000" y="-26" width="14000" height="50" fill="url(#st-road)" />
      {dashes.map((x) => (
        <rect key={x} x={x} y="5" width="70" height="2" fill="#d8d3c8" opacity="0.1" />
      ))}
      <rect x="-3000" y="24" width="14000" height="4" fill="#202020" />
      <rect x="-3000" y="28" width="14000" height="42" fill="#121212" />
      <rect x="-3000" y="70" width="14000" height="3000" fill="url(#st-ground)" />
    </g>
  );
}

/** Statische Umgebung im Nah-Layer (Weltkoordinaten) */
function NearEnvironment() {
  const lamps = [4760, 5280, 5800, 6320, 6840, 7360, 7880];
  const trees = [5560, 7620];
  return (
    <g>
      <PickupBuilding />
      {trees.map((t) => (
        <Tree key={t} x={t} s={0.95} />
      ))}
      {lamps.map((l) => (
        <Lamp key={l} x={l} />
      ))}
      <Street />
    </g>
  );
}

/* ───────────── Fahrzeug ───────────── */

function CarBody({ f }: { f: Frame }) {
  return (
    <>
      {/* Licht & Reflexion auf dem Boden */}
      <ellipse cx="300" cy="1" rx="340" ry="13" fill="url(#st-shadow)" />
      <path d="M4 -58L-520 -12L-520 24L6 -30Z" fill="url(#st-beam)" />
      <ellipse cx="-170" cy="9" rx="260" ry="13" fill="url(#st-pool-white)" />
      <ellipse cx="300" cy="5" rx="320" ry="6" fill="#fff6e6" opacity="0.035" />
      <ellipse cx="690" cy="5" rx="130" ry="10" fill="url(#st-pool-red)" />
      {/* Radkästen */}
      <circle cx={CAR.wheelFrontX} cy={CAR.wheelY} r={GEO.archR} fill="#020202" />
      <circle cx={CAR.wheelRearX} cy={CAR.wheelY} r={GEO.archR} fill="#020202" />
      {/* Innenraum hinter den Scheiben (Fahrer schemenhaft) */}
      <path d={DLO_CABIN} fill="#060606" />
      <g fill="#0f0f0f">
        <ellipse cx="262" cy="-140" rx="8.5" ry="10.5" />
        <path d="M246 -116C246 -126 252 -131 262 -131C272 -131 278 -126 278 -116Z" />
        <path d="M282 -116L282 -142C282 -148 287 -151 292 -151L300 -151C304 -151 306 -148 306 -142L306 -116Z" />
      </g>
      {/* Fond hinter der Tür (sichtbar bei geöffneter Tür) */}
      <g clipPath="url(#st-aperture)">
        <rect x="312" y="-182" width="176" height="172" fill="url(#st-interior)" />
        <path d="M410 -150C412 -157 426 -159 430 -150L440 -58L404 -58Z" fill="#120e0a" />
        <path d="M352 -64L436 -64L438 -52L348 -52Z" fill="#17120d" />
        <path d="M322 -122L478 -124" stroke={GOLD} strokeWidth="1.4" data-r="ambient" opacity={f.door.open} />
        <path d="M322 -36L470 -36" stroke="#050505" strokeWidth="6" />
        <use data-r="paxInside" href="#st-pax" transform={paxTransform(f.pax.x - f.car.x, f.pax.y, f.pax.sx, f.pax.sy)} opacity={f.pax.inside} />
        <rect x="312" y="-182" width="176" height="172" fill="#000" opacity="0.42" />
      </g>
      {/* Räder */}
      {[CAR.wheelFrontX, CAR.wheelRearX].map((wx, i) => (
        <g key={wx} transform={`translate(${wx} ${CAR.wheelY})`}>
          <g data-r={i ? "wheelR" : "wheelF"} transform={`rotate(${f.car.wheel})`}>
            <use href="#st-wheel" />
          </g>
          <circle r={GEO.rimR - 2} fill="#3a3a3a" opacity={f.car.reflectOpacity * 0.5} data-r={i ? "blurR" : "blurF"} />
        </g>
      ))}
      {/* Karosserie */}
      <path d={BODY_WITH_HOLES} fill="url(#st-paint)" fillRule="evenodd" />
      <g clipPath="url(#st-body-clip)">
        {/* großer Lichtreflex auf der Flanke (wie im Studio) */}
        <path d={SWEEP} stroke="url(#st-sweep)" strokeWidth="16" fill="none" strokeLinecap="round" />
        <rect data-r="reflect" x={f.car.reflectX} y="-190" width="150" height="190" fill="url(#st-reflect)" opacity={f.car.reflectOpacity} transform="skewX(-18)" />
      </g>
      {/* Verglasung */}
      <path d={FRONT_GLASS} fill="url(#st-glass2)" />
      <path d={FRONT_GLASS} fill="url(#st-glass-streak)" />
      <path d={B_PILLAR} fill="#030303" />
      {/* Chrom-Fensterrahmen */}
      <path d={DLO_FRAME} stroke="url(#st-chrome)" strokeOpacity="0.9" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      {/* Lichtkanten & Sicken */}
      <path d={ROOFLINE} stroke="url(#st-rimlight)" strokeWidth="5" strokeOpacity="0.2" fill="none" strokeLinecap="round" />
      <path d={ROOFLINE} stroke="url(#st-rimlight)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d={HOOD_LINE} stroke="#f4efe6" strokeOpacity="0.16" strokeWidth="1" fill="none" />
      <path d={SHOULDER} stroke="#f4efe6" strokeOpacity="0.24" strokeWidth="1" fill="none" />
      <path d={SILL} stroke="url(#st-chrome)" strokeOpacity="0.6" strokeWidth="1.3" fill="none" />
      <path d={DOOR_FRONT_EDGE} stroke="#000" strokeOpacity="0.9" strokeWidth="1" fill="none" />
      <path d={DOOR_FRONT_EDGE} stroke="#f4efe6" strokeOpacity="0.07" strokeWidth="0.8" fill="none" transform="translate(0.8 0)" />
      <path d={DOOR_SPLIT} stroke="#000" strokeWidth="1" fill="none" />
      <path d={FRONT_HANDLE} stroke="#f4efe6" strokeOpacity="0.4" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <path d={GRILLE_EDGE} stroke="url(#st-chrome)" strokeOpacity="0.7" strokeWidth="1.6" fill="none" />
      <path d={LOWER_CHROME} stroke="url(#st-chrome)" strokeOpacity="0.45" strokeWidth="1" fill="none" />
      <path
        d={`M${CAR.wheelFrontX + GEO.archR} ${CAR.wheelY + 14}A${GEO.archR} ${GEO.archR} 0 0 0 ${CAR.wheelFrontX - GEO.archR + 1} ${CAR.wheelY + 10}M${CAR.wheelRearX + GEO.archR - 1} ${CAR.wheelY + 12}A${GEO.archR} ${GEO.archR} 0 0 0 ${CAR.wheelRearX - GEO.archR + 2} ${CAR.wheelY + 14}`}
        stroke="#f4efe6"
        strokeOpacity="0.12"
        strokeWidth="1"
        fill="none"
      />
      {/* Außenspiegel */}
      <path d={MIRROR} fill="#0a0a0a" stroke="#f4efe6" strokeOpacity="0.28" strokeWidth="0.9" />
      {/* LED-Scheinwerfer */}
      <path d={HEADLIGHT} fill="#101114" stroke="#f4efe6" strokeOpacity="0.25" strokeWidth="0.6" />
      <path d={DRL} stroke="#ffffff" strokeOpacity="0.18" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d={DRL} stroke="#fffdf8" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="18" cy="-81" r="1.4" fill="#fff" opacity="0.9" />
      <circle cx="26" cy="-82.4" r="1.4" fill="#fff" opacity="0.9" />
      <circle cx="34" cy="-83.6" r="1.4" fill="#fff" opacity="0.9" />
      <circle cx="8" cy="-82" r="60" fill="url(#st-head-glow)" opacity="0.8" />
      {/* LED-Rückleuchte */}
      <path d={TAILLIGHT} fill="#3a0605" />
      <path d={TAIL_LED} stroke="#ff4433" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d={TAILLIGHT} fill="none" stroke="#ff2a1a" strokeOpacity="0.5" strokeWidth="0.8" />
      <circle data-r="brake" cx="612" cy="-96" r="34" fill="url(#st-tail-glow)" opacity={0.3 + f.car.brake * 0.7} />
    </>
  );
}

function CarDoor({ f }: { f: Frame }) {
  return (
    <>
      <path data-r="doorInner" d={f.door.inner} fill="#120e0a" />
      <path data-r="doorOuter" d={f.door.outer} fill="url(#st-paint)" stroke="#000" strokeWidth="1" />
      <path data-r="doorShade" d={f.door.outer} fill="#000" opacity={f.door.shade} />
      <path data-r="doorGlass" d={f.door.glass} fill="url(#st-glass2)" />
      <path data-r="doorTrim" d={f.door.trim} fill="#030303" />
      <path data-r="doorGlassEdge" d={f.door.glass} fill="none" stroke="url(#st-chrome)" strokeOpacity="0.35" strokeWidth="0.9" />
      <path data-r="doorBelt" d={f.door.belt} stroke="url(#st-chrome)" strokeOpacity="0.9" strokeWidth="1.5" fill="none" />
      <path data-r="doorHandle" d={f.door.handle} stroke="#f4efe6" strokeOpacity="0.4" strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </>
  );
}

/* ───────────── Szene ───────────── */

export function SceneBackground({ f }: { f: Frame }) {
  return (
    <>
      <Defs a={poseAttributes(f)} />
      <rect x="-4000" y="-4000" width="8000" height="4000" fill="url(#st-sky)" />
      <ellipse cx="0" cy={BASE} rx="2600" ry="420" fill="url(#st-horizon)" />
      <g data-r="far" transform={`translate(${f.layers.far} 0)`}>
        <Skyline />
      </g>
      <g data-r="mid" transform={`translate(${f.layers.mid} 0)`}>
        <MidCity />
      </g>
      <g data-r="near" transform={`translate(${f.layers.near} 0)`}>
        <NearEnvironment />
      </g>
    </>
  );
}

export function SceneActors({ f }: { f: Frame }) {
  return (
    <g data-r="actors" transform={`translate(${f.layers.near} 0)`}>
      <use data-r="paxBehind" href="#st-pax" transform={paxTransform(f.pax.x, f.pax.y, f.pax.sx, f.pax.sy)} opacity={f.pax.behind} />
      <g data-r="car" transform={`translate(${f.car.x} 0)`}>
        <CarBody f={f} />
      </g>
      <use data-r="paxFront" href="#st-pax" transform={paxTransform(f.pax.x, f.pax.y, f.pax.sx, f.pax.sy)} opacity={f.pax.front} />
      <g data-r="carDoor" transform={`translate(${f.car.x} 0)`}>
        <CarDoor f={f} />
      </g>
    </g>
  );
}

/** Initiale Gelenkwinkel als Attribute (identisch auf Server und Client) */
export function poseAttributes(f: Frame) {
  const p = f.pax.pose;
  return {
    bob: `translate(0 ${p.bob.toFixed(1)})`,
    thighF: rot(p.thighF, JOINTS.hip),
    shinF: rot(p.shinF, JOINTS.knee),
    thighB: rot(p.thighB, JOINTS.hip),
    shinB: rot(p.shinB, JOINTS.knee),
    torsoBack: rot(p.torso, JOINTS.hip),
    torsoMain: rot(p.torso, JOINTS.hip),
    torsoFront: rot(p.torso, JOINTS.hip),
    head: rot(p.head, JOINTS.neck),
    armF: rot(p.armF, JOINTS.shoulder),
    foreF: rot(p.foreF, JOINTS.elbow),
    armB: rot(p.armB, JOINTS.shoulder),
    foreB: rot(p.foreB, JOINTS.elbow),
    skirt: rot(0.7 * ((p.thighF + p.thighB) / 2) + 0.15 * p.torso, JOINTS.hip),
  } as Record<string, string>;
}
