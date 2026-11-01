/**
 * Bewegungs-Engine der Chauffeur-Story.
 *
 * Alles ist eine reine Funktion des Scrollfortschritts p ∈ [0, 1]. Dadurch ist das
 * Vor- und Zurückscrollen immer deterministisch, und Server + Client erzeugen identisches Markup.
 *
 * Koordinaten: Weltkoordinaten in px (≈ 120 px pro Meter). Fahrbahn y = 0, nach oben negativ.
 * Das Fahrzeug blickt nach links (Front bei lokal x = 0, Heck bei x = 620).
 */

import {
  DOOR_BELT_PTS,
  DOOR_GLASS_PTS,
  DOOR_HANDLE_PTS,
  DOOR_OUTLINE_PTS,
  DOOR_QUARTER_PTS,
  DOOR_TRIM_B_PTS,
  DOOR_TRIM_C_PTS,
  GEO,
} from "./car-geometry";

export type Pt = [number, number];

/* ───────────── Konstanten ───────────── */

/**
 * Mercedes-Benz S-Klasse W223 – Maße aus einer exakten 90°-Seitenansicht (siehe car-geometry.ts).
 * Länge 620 Einheiten, Boden y = 0, Front links.
 */
export const CAR = {
  length: 620,
  wheelR: GEO.wheelR,
  wheelY: GEO.wheelY,
  wheelFrontX: GEO.wheelFrontX,
  wheelRearX: GEO.wheelRearX,
  hingeX: GEO.hingeX, // Fondtür-Scharnier an der B-Säule
} as const;

export const WORLD = {
  X0: 7750, // Start (rechts außerhalb)
  X1: 6150, // Halt Abholung
  X3: 3650, // Ende (links außerhalb)
  camOffset: 340,
  nearY: 34, // Gehweg vorne (Kamera-Seite)
  farY: -38, // Gehweg hinten
} as const;

export const PAX_WAIT_X = WORLD.X1 + 730;

/** Kompakter Zeitplan (Anteile des Scrollfortschritts): Ankunft → Einstieg → Abfahrt */
export const T = {
  arrive: [0, 0.27],
  watch: [0.03, 0.2],
  door1Open: [0.26, 0.34],
  walk1: [0.29, 0.45],
  board: [0.45, 0.61],
  door1Close: [0.6, 0.68],
  depart: [0.7, 0.93],
  finale: [0.86, 0.97],
} as const;

export const CAPTION_BREAKS = [0.27, 0.69] as const;

/* ───────────── Mathematik ───────────── */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (p: number, [a, b]: readonly [number, number]) => clamp01((p - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
export const r1 = (v: number) => Math.round(v * 10) / 10;

const deg = (d: number) => (d * Math.PI) / 180;

/* ───────────── Fondtür (Geometrie) ───────────── */

export const DOOR_OUTLINE: Pt[] = DOOR_OUTLINE_PTS;
export const DOOR_GLASS: Pt[] = DOOR_GLASS_PTS;
const DOOR_QUARTER: Pt[] = DOOR_QUARTER_PTS;
const DOOR_TRIM_B: Pt[] = DOOR_TRIM_B_PTS;
const DOOR_TRIM_C: Pt[] = DOOR_TRIM_C_PTS;
const DOOR_HANDLE: Pt[] = DOOR_HANDLE_PTS;
const DOOR_BELT: Pt[] = DOOR_BELT_PTS;

export const toPath = (pts: Pt[], close = true) =>
  pts.map(([x, y], i) => `${i ? "L" : "M"}${r1(x)} ${r1(y)}`).join("") + (close ? "Z" : "");

export const APERTURE_PATH = toPath(DOOR_OUTLINE);

/** Projiziert Türpunkte bei Öffnungswinkel θ (Scharnier vorne, Hinterkante schwenkt zur Kamera). */
function projectDoor(pts: Pt[], theta: number, zOffset = 0): Pt[] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const F = 1500;
  const yc = -100;
  return pts.map(([x, y]) => {
    const dx = x - CAR.hingeX;
    const X = dx * c - zOffset * s;
    const Z = dx * s + zOffset * c;
    const k = F / (F - Z);
    return [CAR.hingeX + X * k, yc + (y - yc) * k + Z * 0.1];
  });
}

/* ───────────── Fahrgast (Posen) ───────────── */

export interface Pose {
  torso: number;
  head: number;
  thighF: number;
  shinF: number;
  thighB: number;
  shinB: number;
  armF: number;
  foreF: number;
  armB: number;
  foreB: number;
  bob: number;
}

const STAND: Pose = { torso: -1, head: 0, thighF: 0, shinF: -2, thighB: 0, shinB: -2, armF: 3, foreF: 10, armB: -2, foreB: 8, bob: 0 };
const WATCH: Pose = { ...STAND, head: -16, armF: 58, foreF: 92 };
const BOARD_A: Pose = { torso: -27, head: -10, thighF: 14, shinF: -10, thighB: -6, shinB: -6, armF: 46, foreF: 34, armB: -12, foreB: 14, bob: 0 };
const BOARD_B: Pose = { torso: -36, head: -14, thighF: 64, shinF: -58, thighB: -12, shinB: -24, armF: 52, foreF: 30, armB: 8, foreB: 22, bob: 2 };
const SEATED: Pose = { torso: 11, head: 2, thighF: 88, shinF: -86, thighB: 84, shinB: -82, armF: 34, foreF: 52, armB: 26, foreB: 48, bob: 0 };

const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const o = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => (o[k] = lerp(a[k], b[k], t)));
  return o;
};

function walkPose(phase: number): Pose {
  const w = 2 * Math.PI * phase;
  const sw = Math.sin(w);
  const flexF = Math.pow(Math.max(0, Math.cos(w)), 1.4);
  const flexB = Math.pow(Math.max(0, -Math.cos(w)), 1.4);
  return {
    torso: -3.5,
    head: 1,
    thighF: 24 * sw,
    shinF: -(5 + 42 * flexF),
    thighB: -24 * sw,
    shinB: -(5 + 42 * flexB),
    armF: -17 * sw,
    foreF: 14 + 12 * Math.max(0, -sw),
    armB: 17 * sw,
    foreB: 14 + 12 * Math.max(0, sw),
    bob: -2.6 * Math.abs(Math.cos(w)) + 1.3,
  };
}

/** Übergang Stehen ↔ Gehen ohne Sprung */
function blendWalk(phase: number, weight: number): Pose {
  return mixPose(STAND, walkPose(phase), weight);
}

const STRIDE = 168; // px pro Doppelschritt bei Skalierung 1

interface PathPt {
  x: number;
  y: number;
  s: number;
}

function along(path: PathPt[], t: number) {
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const l = Math.hypot(b.x - a.x, (b.y - a.y) * 1.6);
    lens.push(l);
    total += l;
  }
  let d = t * total;
  for (let i = 0; i < lens.length; i++) {
    const l = lens[i]!;
    if (d <= l || i === lens.length - 1) {
      const k = l ? clamp01(d / l) : 0;
      const a = path[i]!;
      const b = path[i + 1]!;
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: lerp(a.s, b.s, k), dist: t * total };
    }
    d -= l;
  }
  const last = path[path.length - 1]!;
  return { ...last, dist: total };
}

/* ───────────── Frame ───────────── */

export interface Frame {
  layers: { far: number; mid: number; near: number; fore: number };
  car: { x: number; wheel: number; brake: number; reflectX: number; reflectOpacity: number };
  door: { outer: string; inner: string; glass: string; trim: string; handle: string; belt: string; shade: number; open: number };
  pax: {
    pose: Pose;
    x: number;
    y: number;
    sx: number;
    sy: number;
    behind: number;
    front: number;
    inside: number;
    watchGlint: number;
  };
  caption: number;
  captionOpacity: number;
  finale: number;
  progress: number;
}

export function computeFrame(p: number): Frame {
  p = clamp01(p);

  /* Fahrzeug */
  let carX: number;
  let speed = 0; // normiert 0..1
  let brake = 0;
  if (p < T.arrive[1]) {
    const t = seg(p, T.arrive);
    carX = lerp(WORLD.X0, WORLD.X1, easeOutQuad(t));
    speed = 1 - t;
    brake = t > 0 && t < 1 ? 0.55 + 0.45 * t : 0.6;
  } else if (p < T.depart[0]) {
    carX = WORLD.X1;
    brake = 0.6;
  } else {
    // sanft anfahren (weicher Start, dann zügiger) – nicht hektisch
    const t = seg(p, T.depart);
    const f = t * t * (1.6 - 0.6 * t);
    carX = lerp(WORLD.X1, WORLD.X3, f);
    speed = Math.min(1, t * 1.4);
  }
  const wheel = (-(WORLD.X0 - carX) / CAR.wheelR) * (180 / Math.PI);

  /* Kamera: steht, folgt bei der Abfahrt nur leicht */
  const cam = WORLD.X1 + WORLD.camOffset - 150 * smooth(seg(p, T.depart));

  /* Tür */
  const open = easeInOut(seg(p, T.door1Open)) * (1 - easeInOut(seg(p, T.door1Close)));
  const theta = deg(74) * open;
  const outer = projectDoor(DOOR_OUTLINE, theta);
  const inner = projectDoor(DOOR_OUTLINE, theta, -9);
  const glass = projectDoor(DOOR_GLASS, theta);
  const quarter = projectDoor(DOOR_QUARTER, theta);
  const trimB = projectDoor(DOOR_TRIM_B, theta);
  const trimC = projectDoor(DOOR_TRIM_C, theta);
  const handle = projectDoor(DOOR_HANDLE, theta);
  const belt = projectDoor(DOOR_BELT, theta);

  /* Fahrgast */
  let pose: Pose = STAND;
  let px = PAX_WAIT_X;
  let py: number = WORLD.farY;
  let ps = 0.86;
  const flip = 1;
  let insideW = 0;
  const paxOpacity = 1;

  const standX = 412; // lokal zum Fahrzeug (hinterer Teil der Fondtür)
  const seatedS = 0.9;
  const seatedRoot = { x: 398, y: -60 + 104 * seatedS };

  const boardPath = (e: number) => {
    // e ∈ [0,1] → Position (lokal), Pose, Innen-Gewicht
    if (e < 0.25) {
      const k = smooth(e / 0.25);
      return { x: lerp(standX, 404, k), y: WORLD.nearY, s: 1.04, pose: mixPose(STAND, BOARD_A, k), inside: 0 };
    }
    if (e < 0.55) {
      const k = smooth((e - 0.25) / 0.3);
      return { x: lerp(404, 382, k), y: lerp(WORLD.nearY, 12, k), s: lerp(1.04, 0.98, k), pose: mixPose(BOARD_A, BOARD_B, k), inside: smooth(clamp01((e - 0.38) / 0.17)) };
    }
    const k = smooth((e - 0.55) / 0.45);
    return { x: lerp(382, seatedRoot.x, k), y: lerp(12, seatedRoot.y, k), s: lerp(0.98, seatedS, k), pose: mixPose(BOARD_B, SEATED, k), inside: 1 };
  };

  if (p < T.walk1[0]) {
    // Wartet; schaut kurz auf die Uhr
    const w = seg(p, T.watch);
    const watchAmt = Math.sin(Math.PI * w);
    pose = mixPose(STAND, WATCH, smooth(watchAmt));
  } else if (p < T.board[0]) {
    const t = seg(p, T.walk1);
    const path: PathPt[] = [
      { x: PAX_WAIT_X, y: WORLD.farY, s: 0.86 },
      { x: PAX_WAIT_X - 30, y: WORLD.nearY - 4, s: 1.03 },
      { x: WORLD.X1 + standX, y: WORLD.nearY, s: 1.04 },
    ];
    const pos = along(path, easeInOut(t));
    px = pos.x;
    py = pos.y;
    ps = pos.s;
    const weight = smooth(clamp01(t / 0.12)) * smooth(clamp01((1 - t) / 0.12));
    pose = blendWalk(pos.dist / (STRIDE * pos.s), weight);
  } else if (p < T.board[1]) {
    const b = boardPath(seg(p, T.board));
    px = WORLD.X1 + b.x;
    py = b.y;
    ps = b.s;
    pose = b.pose;
    insideW = b.inside;
  } else {
    px = carX + seatedRoot.x;
    py = seatedRoot.y;
    ps = seatedS;
    pose = SEATED;
    insideW = 1;
  }

  const isFar = py < 0 && insideW === 0;
  const behind = isFar ? paxOpacity : 0;
  const front = isFar ? 0 : (1 - insideW) * paxOpacity;
  const inside = insideW * paxOpacity;

  /* Reflexionen der Straßenlaternen auf dem Lack */
  const spacing = 520;
  const reflectX = ((((-carX % spacing) + spacing) % spacing) / spacing) * 900 - 160;

  /* Texte */
  const caption = p < CAPTION_BREAKS[0] ? 0 : p < CAPTION_BREAKS[1] ? 1 : 2;
  const finale = smooth(seg(p, T.finale));

  return {
    layers: { far: r1(-cam * 0.12), mid: r1(-cam * 0.42), near: r1(-cam), fore: 0 },
    car: { x: r1(carX), wheel: r1(wheel % 360), brake: Math.round(brake * 100) / 100, reflectX: r1(reflectX), reflectOpacity: Math.round(speed * 0.9 * 100) / 100 },
    door: {
      outer: toPath(outer),
      inner: toPath(inner),
      glass: toPath(glass) + toPath(quarter),
      trim: toPath(trimB) + toPath(trimC),
      handle: toPath(handle, false),
      belt: toPath(belt, false),
      shade: Math.round(Math.sin(theta) * 0.42 * 100) / 100,
      open: Math.round(open * 100) / 100,
    },
    pax: {
      pose,
      x: r1(px),
      y: r1(py),
      sx: Math.round(ps * flip * 1000) / 1000,
      sy: Math.round(ps * 1000) / 1000,
      behind: Math.round(behind * 100) / 100,
      front: Math.round(front * 100) / 100,
      inside: Math.round(inside * 100) / 100,
      watchGlint: p < T.walk1[0] ? Math.round(Math.sin(Math.PI * seg(p, T.watch)) * 100) / 100 : 0,
    },
    caption,
    captionOpacity: Math.round((1 - finale) * 100) / 100,
    finale: Math.round(finale * 1000) / 1000,
    progress: Math.round(p * 1000) / 1000,
  };
}

/** Joint-Transformationen der Figur (lokale Koordinaten, Füße bei y = 0). */
export const JOINTS = {
  hip: [0, -104] as Pt,
  knee: [0, -56] as Pt,
  shoulder: [1, -170] as Pt,
  elbow: [1, -133] as Pt,
  neck: [0, -181] as Pt,
};

export function rot(angle: number, [x, y]: Pt) {
  return `rotate(${r1(angle)} ${x} ${y})`;
}

export function paxTransform(x: number, y: number, sx: number, sy: number) {
  return `translate(${r1(x)} ${r1(y)}) scale(${sx} ${sy})`;
}

/** Statisches Standbild (SSR, reduzierte Bewegung, ohne JavaScript) */
export const STATIC_P = 0.4;
