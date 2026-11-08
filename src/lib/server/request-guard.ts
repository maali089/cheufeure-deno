import "server-only";
import { NextResponse } from "next/server";

/**
 * Client-IP für Rate-Limits. Auf Vercel wird X-Forwarded-For von der Plattform gesetzt
 * bzw. überschrieben und ist daher vertrauenswürdig. Bei anderem Hosting muss ein
 * vorgelagerter Proxy diesen Header ebenfalls überschreiben.
 */
export function clientIpFromHeaders(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  return (fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown").slice(0, 64);
}

export const clientIp = (req: Request) => clientIpFromHeaders(req.headers);

/**
 * Für GET-Endpunkte, die kostenpflichtige Dienste auslösen (Google Places):
 * Browser senden Sec-Fetch-Site – Aufrufe von fremden Websites werden abgelehnt.
 */
export function isCrossSiteBrowserRequest(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  return site !== null && site !== "same-origin" && site !== "none";
}

/** Lehnt Cross-Site-POSTs ab (Origin muss zum Host passen). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // z. B. serverseitige Aufrufe ohne Origin
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson(req: Request, maxBytes = 20_000): Promise<unknown> {
  // Nur JSON annehmen: HTML-Formulare fremder Seiten können diesen Typ nicht ohne CORS-Preflight senden
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) throw new PayloadError("Ungültiges Datenformat.");
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new PayloadError("Anfrage ist zu groß.");
  const text = await req.text();
  if (text.length > maxBytes) throw new PayloadError("Anfrage ist zu groß.");
  try {
    return JSON.parse(text);
  } catch {
    throw new PayloadError("Ungültiges Datenformat.");
  }
}

export class PayloadError extends Error {}

/** Spam-Schutz: Honeypot leer + plausible Ausfülldauer. */
export function looksLikeSpam(data: { website?: string; startedAt: number }, minMs = 2500): boolean {
  if (data.website && data.website.trim() !== "") return true;
  const elapsed = Date.now() - data.startedAt;
  return elapsed < minMs || elapsed > 1000 * 60 * 60 * 24;
}

export const jsonError = (status: number, message: string, fieldErrors?: Record<string, string>) =>
  NextResponse.json({ ok: false, message, fieldErrors }, { status });
