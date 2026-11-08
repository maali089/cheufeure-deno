import { NextResponse } from "next/server";
import { autocompletePlaces, isPlacesConfigured } from "@/lib/server/maps";
import { rateLimit } from "@/lib/server/rate-limit";
import { clientIp, isCrossSiteBrowserRequest } from "@/lib/server/request-guard";

export const runtime = "nodejs";

/** Adress-Autovervollständigung (Proxy zu Google Places). GET /api/places?q=…&s=<session> */
export async function GET(req: Request) {
  // Kostenpflichtige Google-API nicht als offenen Proxy für fremde Websites bereitstellen
  if (isCrossSiteBrowserRequest(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!isPlacesConfigured()) return NextResponse.json({ enabled: false, suggestions: [] });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const session = (url.searchParams.get("s") ?? "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
  if (q.length < 3) return NextResponse.json({ enabled: true, suggestions: [] });

  const limit = await rateLimit(`places:${clientIp(req)}`, 60, 60 * 1000);
  if (!limit.ok) return NextResponse.json({ enabled: true, suggestions: [], error: "rate_limited" }, { status: 429 });

  try {
    const suggestions = await autocompletePlaces(q, session || crypto.randomUUID());
    return NextResponse.json({ enabled: true, suggestions });
  } catch (e) {
    console.error("[places]", e instanceof Error ? e.message.slice(0, 120) : "Fehler");
    return NextResponse.json({ enabled: true, suggestions: [], error: "unavailable" }, { status: 502 });
  }
}
