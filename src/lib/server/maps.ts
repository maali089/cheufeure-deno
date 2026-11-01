import "server-only";

/**
 * Kartenanbieter: Google Maps Platform (Places API (New) + Routes API).
 * Alle Aufrufe laufen über den Server – der API-Schlüssel und die IP-Adresse
 * des Besuchers werden nicht an den Browser bzw. an Google weitergegeben.
 */
const key = () => process.env.GOOGLE_MAPS_API_KEY || "";
export const isPlacesConfigured = () => key().length > 0;
export const isRouteCalculationEnabled = () => isPlacesConfigured() && process.env.ROUTE_CALCULATION_ENABLED === "true";

export interface PlaceSuggestion {
  placeId: string;
  label: string;
  main: string;
  secondary: string;
}

// Standort-Bias: Geschäftssitz Maisach (keine Einschränkung, nur Priorisierung)
const BIAS = { latitude: 48.2167, longitude: 11.2667, radius: 50000 };

export async function autocompletePlaces(input: string, sessionToken: string): Promise<PlaceSuggestion[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key() },
    body: JSON.stringify({
      input,
      sessionToken,
      languageCode: "de",
      regionCode: "de",
      locationBias: { circle: { center: { latitude: BIAS.latitude, longitude: BIAS.longitude }, radius: BIAS.radius } },
    }),
    signal: AbortSignal.timeout(4000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Places API: HTTP ${res.status}`);
  const json = (await res.json()) as {
    suggestions?: { placePrediction?: { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }[];
  };
  return (json.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
    .slice(0, 6)
    .map((p) => ({
      placeId: p.placeId,
      label: p.text?.text ?? p.structuredFormat?.mainText?.text ?? "",
      main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
    }));
}

type Waypoint = { address: string; placeId?: string };
const wp = (w: Waypoint) => (w.placeId ? { placeId: w.placeId } : { address: w.address });

/** Echte Routenberechnung (Distanz/Dauer). Gibt null zurück, wenn nicht konfiguriert oder fehlgeschlagen. */
export async function computeRoute(origin: Waypoint, destination: Waypoint, stops: Waypoint[] = []) {
  if (!isRouteCalculationEnabled()) return null;
  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key(), "X-Goog-FieldMask": "routes.distanceMeters,routes.duration" },
      body: JSON.stringify({ origin: wp(origin), destination: wp(destination), intermediates: stops.map(wp), travelMode: "DRIVE", languageCode: "de" }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { routes?: { distanceMeters?: number; duration?: string }[] };
    const r = json.routes?.[0];
    if (!r?.distanceMeters || !r.duration) return null;
    return { distanceMeters: r.distanceMeters, durationSeconds: Number.parseInt(r.duration, 10) };
  } catch {
    return null;
  }
}
