import "server-only";

/**
 * Kartenanbieter: OpenStreetMap-Daten über freie Open-Source-Dienste, ohne API-Schlüssel.
 *  - Photon (https://photon.komoot.io) für Adressvorschläge und Geokodierung
 *  - OSRM (https://project-osrm.org) für Distanz und Fahrzeit
 * Alle Aufrufe laufen über den Server – die IP-Adresse des Besuchers wird nicht
 * an die Dienste weitergegeben. Die öffentlichen Instanzen sind für geringe Last
 * gedacht (Fair Use); über PHOTON_URL / OSRM_URL lassen sich eigene Instanzen nutzen.
 */
const base = (value: string | undefined, fallback: string) => (value?.trim() || fallback).replace(/\/+$/, "");
const photonUrl = () => base(process.env.PHOTON_URL, "https://photon.komoot.io");
const osrmUrl = () => base(process.env.OSRM_URL, "https://router.project-osrm.org");
const HEADERS = { "User-Agent": "deeno-chauffeur-website" };

export const isPlacesConfigured = () => process.env.ADDRESS_AUTOCOMPLETE_ENABLED === "true";
export const isRouteCalculationEnabled = () => process.env.ROUTE_CALCULATION_ENABLED === "true";

export interface PlaceSuggestion {
  /** Koordinaten des Vorschlags im Format "lat,lon" */
  placeId: string;
  label: string;
  main: string;
  secondary: string;
}

// Standort-Bias: Geschäftssitz Maisach (keine Einschränkung, nur Priorisierung)
const BIAS = { latitude: 48.2167, longitude: 11.2667 };

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: { name?: string; street?: string; housenumber?: string; postcode?: string; city?: string; district?: string; state?: string; country?: string; countrycode?: string };
}

async function photonSearch(q: string, limit: number, timeoutMs: number): Promise<PhotonFeature[]> {
  const params = new URLSearchParams({ q, lang: "de", limit: String(limit), lat: String(BIAS.latitude), lon: String(BIAS.longitude) });
  const res = await fetch(`${photonUrl()}/api?${params}`, { headers: HEADERS, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  if (!res.ok) throw new Error(`Photon: HTTP ${res.status}`);
  const json = (await res.json()) as { features?: PhotonFeature[] };
  return json.features ?? [];
}

type Coordinate = { lat: number; lon: number };

function coordinateOf(f: PhotonFeature): Coordinate | null {
  const [lon, lat] = f.geometry?.coordinates ?? [];
  return validCoordinate(lat, lon) ? { lat: lat!, lon: lon! } : null;
}

function validCoordinate(lat: number | undefined, lon: number | undefined) {
  return typeof lat === "number" && typeof lon === "number" && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

function toSuggestion(f: PhotonFeature): PlaceSuggestion | null {
  const c = coordinateOf(f);
  const p = f.properties;
  if (!c || !p) return null;
  const streetLine = [p.street, p.housenumber].filter(Boolean).join(" ");
  const locality = [p.postcode, p.city ?? p.district ?? p.state].filter(Boolean).join(" ");
  const country = p.countrycode === "DE" ? undefined : p.country;
  const main = p.name ?? streetLine;
  // Ohne Namen ist die Straße schon die Hauptzeile; reine Orte (Stadt = Name) nicht doppelt nennen
  const secondary = [p.name && streetLine !== p.name ? streetLine : "", locality === main ? "" : locality, country].filter(Boolean).join(", ");
  if (!main) return null;
  return { placeId: `${c.lat.toFixed(6)},${c.lon.toFixed(6)}`, label: [main, secondary].filter(Boolean).join(", "), main, secondary };
}

export async function autocompletePlaces(input: string): Promise<PlaceSuggestion[]> {
  const seen = new Set<string>();
  return (await photonSearch(input, 8, 4000))
    .map(toSuggestion)
    .filter((s): s is PlaceSuggestion => !!s && !seen.has(s.label) && !!seen.add(s.label))
    .slice(0, 6);
}

type Waypoint = { address: string; placeId?: string };

/** Koordinaten aus dem gewählten Vorschlag; sonst wird die frei eingegebene Adresse geokodiert. */
async function locate(w: Waypoint): Promise<Coordinate | null> {
  const m = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(w.placeId ?? "");
  if (m) {
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    if (validCoordinate(lat, lon)) return { lat, lon };
  }
  const [first] = await photonSearch(w.address, 1, 4000);
  return first ? coordinateOf(first) : null;
}

/** Echte Routenberechnung (Distanz/Dauer). Gibt null zurück, wenn nicht aktiviert oder fehlgeschlagen. */
export async function computeRoute(origin: Waypoint, destination: Waypoint, stops: Waypoint[] = []) {
  if (!isRouteCalculationEnabled()) return null;
  try {
    const points = await Promise.all([origin, ...stops, destination].map(locate));
    if (points.some((p) => !p)) return null;
    const path = points.map((p) => `${p!.lon},${p!.lat}`).join(";");
    const res = await fetch(`${osrmUrl()}/route/v1/driving/${path}?overview=false`, { headers: HEADERS, signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { code?: string; routes?: { distance?: number; duration?: number }[] };
    const r = json.routes?.[0];
    if (json.code !== "Ok" || !r?.distance || !r.duration) return null;
    return { distanceMeters: Math.round(r.distance), durationSeconds: Math.round(r.duration) };
  } catch {
    return null;
  }
}
