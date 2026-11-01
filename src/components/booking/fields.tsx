"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MinusIcon, PlusIcon } from "@/components/icons";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {optional && <span className="ml-2 normal-case tracking-normal text-mist/70">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-2 text-xs leading-relaxed text-mist">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Stepper({
  id,
  label,
  value,
  min,
  max,
  onChange,
  icon,
  error,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  icon?: ReactNode;
  error?: string;
}) {
  const v = Number.isFinite(value) ? value : min;
  return (
    <div>
      <span id={`${id}-label`} className="field-label">
        {label}
      </span>
      <div className={`flex h-[3.25rem] items-stretch border bg-ink/60 ${error ? "border-error" : "border-line"}`} role="group" aria-labelledby={`${id}-label`}>
        <button
          type="button"
          className="flex w-12 items-center justify-center text-gold transition-colors hover:bg-white/[0.04] disabled:text-mist/40"
          onClick={() => onChange(Math.max(min, v - 1))}
          disabled={v <= min}
          aria-label={`${label} verringern`}
        >
          <MinusIcon size={18} />
        </button>
        <div className="flex flex-1 items-center justify-center gap-2.5 border-x border-line">
          {icon && <span className="text-gold">{icon}</span>}
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={v}
            aria-invalid={!!error}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
            }}
            className="w-10 bg-transparent text-center text-lg text-ivory outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <button
          type="button"
          className="flex w-12 items-center justify-center text-gold transition-colors hover:bg-white/[0.04] disabled:text-mist/40"
          onClick={() => onChange(Math.min(max, v + 1))}
          disabled={v >= max}
          aria-label={`${label} erhöhen`}
        >
          <PlusIcon size={18} />
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

interface Suggestion {
  placeId: string;
  label: string;
  main: string;
  secondary: string;
}

/**
 * Adressfeld mit Autovervollständigung über /api/places (serverseitiger Proxy).
 * Ohne konfigurierten Kartenanbieter verhält es sich wie ein normales Textfeld.
 */
export function AddressInput({
  id,
  value,
  onChange,
  onSelectPlace,
  placeholder,
  enabled,
  error,
  icon,
  autoComplete = "street-address",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onSelectPlace: (placeId: string | undefined) => void;
  placeholder?: string;
  enabled: boolean;
  error?: string;
  icon?: ReactNode;
  autoComplete?: string;
}) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const sessionRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const listId = useId();
  const typedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !typedRef.current) return;
    const q = value.trim();
    if (q.length < 3) return;
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      if (!sessionRef.current) sessionRef.current = crypto.randomUUID();
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}&s=${sessionRef.current}`, { signal: ac.signal });
        const json = (await res.json()) as { suggestions?: Suggestion[] };
        setItems(json.suggestions ?? []);
        setOpen(true);
        setActive(-1);
      } catch {
        /* abgebrochen oder nicht erreichbar – Eingabe bleibt frei möglich */
      }
    }, 260);
    return () => clearTimeout(t);
  }, [value, enabled]);

  const choose = (s: Suggestion) => {
    typedRef.current = false;
    onChange(s.label);
    onSelectPlace(s.placeId);
    setOpen(false);
    setItems([]);
    sessionRef.current = ""; // neue Sitzung für die nächste Suche
  };

  const showList = enabled && open && items.length > 0 && value.trim().length >= 3;

  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gold">{icon}</span>}
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete={enabled ? "off" : autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        role={enabled ? "combobox" : undefined}
        aria-expanded={enabled ? showList : undefined}
        aria-controls={enabled ? listId : undefined}
        aria-autocomplete={enabled ? "list" : undefined}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        className={`field ${icon ? "pl-11" : ""}`}
        onChange={(e) => {
          typedRef.current = true;
          onChange(e.target.value);
          onSelectPlace(undefined);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(items.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            choose(items[active]!);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto border border-line bg-graphite shadow-2xl shadow-black/60">
          {items.map((s, i) => (
            <li
              key={s.placeId}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`cursor-pointer px-4 py-3 text-sm ${i === active ? "bg-gold/10" : "hover:bg-white/[0.04]"}`}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
            >
              <span className="block text-ivory">{s.main}</span>
              {s.secondary && <span className="block text-xs text-mist">{s.secondary}</span>}
            </li>
          ))}
          <li className="px-4 py-2 text-right text-[0.6rem] uppercase tracking-[0.15em] text-mist/70" aria-hidden>
            Vorschläge: Google
          </li>
        </ul>
      )}
    </div>
  );
}
