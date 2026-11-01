import "server-only";
import { NextResponse } from "next/server";

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").slice(0, 64);
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
