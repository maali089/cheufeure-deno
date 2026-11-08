import "server-only";
import { logError } from "./log";

/**
 * Bot-Schutz mit Cloudflare Turnstile (datenschutzfreundliche CAPTCHA-Alternative).
 * Aktiv nur, wenn BEIDE Schlüssel gesetzt sind:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY (öffentlich, Browser) und TURNSTILE_SECRET_KEY (geheim, Server).
 * Ist er aktiv, wird jedes Formular serverseitig geprüft (fail closed).
 */
export const isTurnstileEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string | undefined, ip: string, expectedAction: string): Promise<boolean> {
  if (!isTurnstileEnabled()) return true;
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!res.ok) return false;
    const json = (await res.json()) as { success?: boolean; action?: string };
    return json.success === true && (!json.action || json.action === expectedAction);
  } catch (e) {
    logError("turnstile", e);
    return false;
  }
}
