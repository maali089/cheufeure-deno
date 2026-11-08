"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile (Bot-Schutz). Wird nur gerendert, wenn NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * gesetzt ist – ohne Schlüssel bleibt das Formular unverändert. Die eigentliche Prüfung
 * erfolgt serverseitig (src/lib/server/turnstile.ts).
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
export const isTurnstileActive = TURNSTILE_SITE_KEY.length > 0;

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;
function loadScript() {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile konnte nicht geladen werden."));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** resetKey erhöhen, um nach einem Fehlversuch ein neues Token anzufordern (Tokens sind einmalig). */
export function TurnstileWidget({ action, onToken, resetKey = 0 }: { action: string; onToken: (token: string) => void; resetKey?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);
  const cb = useRef(onToken);
  useEffect(() => {
    cb.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!isTurnstileActive) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        idRef.current = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: "dark",
          language: "de",
          "refresh-expired": "auto",
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(""),
          "error-callback": () => cb.current(""),
        });
      })
      .catch(() => cb.current(""));
    return () => {
      cancelled = true;
      if (idRef.current && window.turnstile) window.turnstile.remove(idRef.current);
      idRef.current = null;
    };
  }, [action]);

  useEffect(() => {
    if (resetKey > 0 && idRef.current && window.turnstile) {
      cb.current("");
      window.turnstile.reset(idRef.current);
    }
  }, [resetKey]);

  if (!isTurnstileActive) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}

/**
 * Token-Verwaltung für Formulare: waitForToken() wartet kurz, falls das Widget beim
 * Absenden noch prüft (dauert typischerweise 1–3 Sekunden).
 */
export function useTurnstile() {
  const tokenRef = useRef("");
  const waiters = useRef<((t: string) => void)[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const onToken = useCallback((t: string) => {
    tokenRef.current = t;
    if (t) for (const w of waiters.current.splice(0)) w(t);
  }, []);
  const waitForToken = useCallback((timeoutMs = 15_000) => {
    if (!isTurnstileActive || tokenRef.current) return Promise.resolve(tokenRef.current);
    return new Promise<string>((resolve) => {
      const done = (t: string) => {
        clearTimeout(timer);
        resolve(t);
      };
      const timer = setTimeout(() => {
        waiters.current = waiters.current.filter((w) => w !== done);
        resolve("");
      }, timeoutMs);
      waiters.current.push(done);
    });
  }, []);
  /** Nach jedem Absenden aufrufen – Tokens sind nur einmal gültig. */
  const reset = useCallback(() => {
    tokenRef.current = "";
    setResetKey((k) => k + 1);
  }, []);
  return { onToken, waitForToken, reset, resetKey };
}
