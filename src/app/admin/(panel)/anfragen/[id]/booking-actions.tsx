"use client";

import { useActionState } from "react";
import { bookingStatusLabels, bookingStatuses, type BookingStatusValue } from "@/lib/validation";
import { cancelBooking, confirmBooking, saveAgreedPrice, updateBookingStatus, type ActionState } from "../../../actions";

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="border-l-2 border-error bg-error/[0.08] px-3 py-2 text-sm text-ivory">
        {state.error}
      </p>
    );
  return (
    <p role="status" className="border-l-2 border-emerald-300/60 bg-emerald-300/[0.06] px-3 py-2 text-sm text-ivory">
      {state.ok}
    </p>
  );
}

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <p className="flex items-center gap-3 text-sm font-medium">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/60 text-xs text-gold">{n}</span>
      {title}
    </p>
    {children}
  </div>
);

export interface BookingActionsProps {
  id: string;
  status: BookingStatusValue;
  agreedPriceInput: string; // z. B. "149,90"
  agreedPriceText: string | null; // z. B. "149,90 €"
  offerHref: string | null;
  confirmationHref: string | null;
  email: string;
  mailConfigured: boolean;
  confirmationSent: boolean;
}

export function BookingActions(p: BookingActionsProps) {
  const [priceState, priceAction, pricePending] = useActionState(saveAgreedPrice, undefined);
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmBooking, undefined);
  const [statusState, statusAction, statusPending] = useActionState(updateBookingStatus, undefined);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelBooking, undefined);

  const closed = p.status === "REJECTED" || p.status === "COMPLETED" || p.status === "CANCELLED";
  const confirmed = p.status === "CONFIRMED";
  const canConfirm = !closed && !confirmed && !!p.agreedPriceText;

  return (
    <>
      <section className="border border-gold/40 bg-coal p-6" aria-labelledby="pa-title">
        <h2 id="pa-title" className="eyebrow mb-5">
          Preisabsprache & Bestätigung
        </h2>
        <div className="space-y-7">
          <Step n={1} title="Fahrgast per WhatsApp kontaktieren">
            {p.offerHref ? (
              <>
                <a href={p.offerHref} target="_blank" rel="noopener noreferrer" className="btn btn-gold min-h-11 w-full" data-testid="wa-offer">
                  WhatsApp-Chat öffnen
                </a>
                <p className="text-xs text-mist">Die Nachricht mit allen Fahrtdaten ist vorbereitet. Sie wird erst gesendet, wenn Sie in WhatsApp selbst auf „Senden“ tippen.</p>
              </>
            ) : (
              <p className="text-sm text-error">Die Telefonnummer ist für WhatsApp nicht geeignet. Bitte rufen Sie den Fahrgast an.</p>
            )}
          </Step>

          <Step n={2} title="Vereinbarten Preis eintragen">
            <form action={priceAction} className="space-y-3">
              <input type="hidden" name="id" value={p.id} />
              <label htmlFor="price" className="sr-only">
                Vereinbarter Preis in Euro
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="price"
                    name="price"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="149,90"
                    defaultValue={p.agreedPriceInput}
                    disabled={closed}
                    required
                    maxLength={12}
                    className="field min-h-11 pr-8"
                    aria-describedby="price-hint"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">€</span>
                </div>
                <button className="btn btn-ghost min-h-11 px-4" disabled={closed || pricePending}>
                  {pricePending ? "…" : "Preis speichern"}
                </button>
              </div>
              <p id="price-hint" className="text-xs text-mist">
                {p.agreedPriceText ? `Gespeichert: ${p.agreedPriceText}` : "Noch kein Preis vereinbart."}
              </p>
              <Feedback state={priceState} />
            </form>
          </Step>

          <Step n={3} title="Fahrt bestätigen">
            {confirmed ? (
              <p className="text-sm text-emerald-200">Die Fahrt ist bestätigt{p.agreedPriceText ? ` (${p.agreedPriceText})` : ""}.</p>
            ) : (
              <form action={confirmAction} className="space-y-3">
                <input type="hidden" name="id" value={p.id} />
                <label className={`flex items-start gap-3 text-sm ${p.mailConfigured ? "" : "opacity-60"}`}>
                  <input type="checkbox" name="sendMail" defaultChecked={p.mailConfigured} disabled={!p.mailConfigured} className="mt-1 h-4 w-4 accent-[#C6A66B]" />
                  <span>
                    Zusätzlich Bestätigungs-E-Mail an <span className="break-all">{p.email}</span>
                    {!p.mailConfigured && <span className="block text-xs text-mist">(E-Mail-Versand ist nicht eingerichtet)</span>}
                  </span>
                </label>
                <button className="btn btn-gold min-h-11 w-full" disabled={!canConfirm || confirmPending} aria-busy={confirmPending}>
                  {confirmPending ? "Wird bestätigt …" : "Fahrt bestätigen"}
                </button>
                {!p.agreedPriceText && !closed && <p className="text-xs text-mist">Erst möglich, wenn ein Preis gespeichert ist.</p>}
              </form>
            )}
            <Feedback state={confirmState} />
          </Step>

          {confirmed && (
            <Step n={4} title="Bestätigung an den Fahrgast senden">
              {p.confirmationHref ? (
                <a href={p.confirmationHref} target="_blank" rel="noopener noreferrer" className="btn btn-gold min-h-11 w-full" data-testid="wa-confirm">
                  Bestätigung per WhatsApp senden
                </a>
              ) : (
                <p className="text-sm text-error">Keine WhatsApp-fähige Telefonnummer – bitte telefonisch bestätigen.</p>
              )}
              <p className="text-xs text-mist">
                Enthält Auftragsnummer, Fahrtdaten und den vereinbarten Preis. Sie senden die Nachricht selbst ab.
                {p.confirmationSent ? " Die Bestätigungs-E-Mail wurde bereits versendet." : ""}
              </p>
            </Step>
          )}
        </div>
      </section>

      <section className="border border-white/[0.08] bg-coal p-6">
        <h2 className="eyebrow mb-4">Status ändern</h2>
        <form action={statusAction} className="space-y-4">
          <input type="hidden" name="id" value={p.id} />
          <select key={p.status} name="status" defaultValue={p.status} className="field min-h-11" aria-label="Status">
            {bookingStatuses.map((s) => (
              <option key={s} value={s}>
                {bookingStatusLabels[s]}
              </option>
            ))}
          </select>
          <textarea name="note" rows={2} className="field" placeholder="Notiz zur Änderung (optional)" aria-label="Notiz" />
          <button className="btn btn-ghost w-full min-h-11" disabled={statusPending}>
            Speichern
          </button>
          <Feedback state={statusState} />
        </form>
        <p className="mt-3 text-xs text-mist">Der Fahrgast wird bei einer Statusänderung nicht automatisch benachrichtigt.</p>
      </section>

      {p.status !== "CANCELLED" && p.status !== "COMPLETED" && (
        <section className="border border-white/[0.08] bg-coal p-6">
          <h2 className="eyebrow mb-4">Fahrt stornieren</h2>
          <form
            action={cancelAction}
            className="space-y-4"
            onSubmit={(e) => {
              if (!window.confirm("Diese Fahrt wirklich stornieren?")) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={p.id} />
            <textarea name="note" rows={2} className="field" placeholder="Grund (optional), z. B. Absage durch den Fahrgast" aria-label="Grund der Stornierung" />
            <button className="w-full min-h-11 border border-error/50 px-4 text-xs uppercase tracking-[0.16em] text-ivory/85 hover:border-error hover:text-ivory" disabled={cancelPending}>
              Fahrt stornieren
            </button>
          </form>
          <div className="mt-3">
            <Feedback state={cancelState} />
          </div>
        </section>
      )}
      {p.status === "CANCELLED" && <Feedback state={cancelState} />}
    </>
  );
}
