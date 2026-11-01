"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch, type FieldPath } from "react-hook-form";
import type { z } from "zod";
import { vehicleImages } from "@/components/fleet/vehicle-images";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  FlagIcon,
  PinIcon,
  PlaneIcon,
  PlusIcon,
  SuitcaseIcon,
  UsersIcon,
  WhatsappIcon,
} from "@/components/icons";
import { PRESELECT_EVENT, type PreselectDetail } from "@/components/ui/preselect";
import { company, telHref } from "@/config/company";
import type { VehicleSlug } from "@/config/fleet";
import { berlinNow, formatDateDe } from "@/lib/datetime";
import {
  MAX_HOURS,
  MAX_LUGGAGE,
  MAX_PASSENGERS,
  MAX_STOPS,
  bookingSchema,
  customerStepSchema,
  tripStepSchema,
  tripTypeLabels,
  tripTypes,
  vehicleStepSchema,
  type TripTypeValue,
} from "@/lib/validation";
import { whatsappHref, whatsappTripMessage } from "@/lib/whatsapp";
import { AddressInput, Field, Stepper } from "./fields";

export interface BookingVehicle {
  slug: VehicleSlug;
  model: string;
  category: string;
  passengers: number;
  luggage: number;
  features: string[];
  imageAlt: string;
  imageNote?: string;
  imagePosition?: string;
  enabled: boolean;
  confirmed: boolean;
}

export interface BookingFormValues {
  tripType: TripTypeValue;
  pickupAddress: string;
  pickupPlaceId?: string;
  dropoffAddress: string;
  dropoffPlaceId?: string;
  stops: { address: string }[];
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  durationHours: number;
  passengers: number;
  luggage: number;
  flightNumber: string;
  tripNotes: string;
  vehicleClass: VehicleSlug | "";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  specialRequests: string;
  privacy: boolean;
  website: string;
  startedAt: number;
}

const STEPS = ["Fahrt", "Fahrzeug", "Kontakt", "Übersicht"] as const;

export interface VehicleOfferView {
  slug: VehicleSlug;
  payable: boolean;
  price: { amount: number; currency: string } | null;
}

const DRAFT_KEY = "deeno:booking-draft";
const noopSubscribe = () => () => {};
export const DRAFT_EVENT = "deeno:booking-draft-updated";
const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

function readDraft(): { values: Partial<BookingFormValues>; step: number; maxStep: number } | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const STEP_FIELDS: FieldPath<BookingFormValues>[][] = [
  ["tripType", "pickupAddress", "dropoffAddress", "stops", "pickupDate", "pickupTime", "returnDate", "returnTime", "durationHours", "passengers", "luggage", "flightNumber", "tripNotes"],
  ["vehicleClass"],
  ["firstName", "lastName", "email", "phone", "company", "specialRequests", "privacy"],
  [],
];

const tripIcons: Record<TripTypeValue, typeof PinIcon> = { ONE_WAY: ArrowRightIcon, ROUND_TRIP: FlagIcon, AIRPORT: PlaneIcon, HOURLY: ClockIcon };

const defaults: BookingFormValues = {
  tripType: "ONE_WAY",
  pickupAddress: "",
  dropoffAddress: "",
  stops: [],
  pickupDate: "",
  pickupTime: "",
  returnDate: "",
  returnTime: "",
  durationHours: 3,
  passengers: 1,
  luggage: 1,
  flightNumber: "",
  tripNotes: "",
  vehicleClass: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  specialRequests: "",
  privacy: false,
  website: "",
  startedAt: 0,
};

function stepOfField(field: string) {
  const root = field.split(".")[0];
  const idx = STEP_FIELDS.findIndex((fs) => fs.includes(root as FieldPath<BookingFormValues>));
  return idx < 0 ? 0 : idx;
}

export function BookingForm({ vehicles, placesEnabled, instanceId = "inline" }: { vehicles: BookingVehicle[]; placesEnabled: boolean; instanceId?: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const methods = useForm<BookingFormValues>({ defaultValues: defaults, mode: "onChange", shouldFocusError: true });
  const { handleSubmit, getValues, setError, clearErrors, setValue, setFocus, reset, subscribe, control } = methods;
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [maxStep, setMaxStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const anchorId = useId();
  const [offers, setOffers] = useState<VehicleOfferView[] | null>(null);
  const [offersLoading, setOffersLoading] = useState(false);
  const restoredRef = useRef(false);

  const loadOffers = useCallback(async () => {
    setOffersLoading(true);
    try {
      const v = getValues();
      const res = await fetch("/api/booking/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, durationHours: v.tripType === "HOURLY" ? v.durationHours : undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { offers?: VehicleOfferView[] };
      setOffers(json.offers ?? null);
    } catch {
      setOffers(null);
    } finally {
      setOffersLoading(false);
    }
  }, [getValues]);

  // Entwurf wiederherstellen (bleibt beim Schließen des Buchungsfensters erhalten)
  useEffect(() => {
    const apply = () => {
      const d = readDraft();
      if (!d) return;
      reset({ ...defaults, ...d.values, website: "", startedAt: d.values.startedAt || Date.now() });
      setStep(Math.min(3, Math.max(0, d.step ?? 0)));
      setMaxStep(Math.min(3, Math.max(0, d.maxStep ?? 0)));
      if ((d.step ?? 0) >= 1) void loadOffers();
    };
    apply();
    restoredRef.current = true;
    // Nur das Seitenformular übernimmt Änderungen – und zwar erst, wenn das Buchungsfenster geschlossen wird
    const onOther = (e: Event) => {
      if (instanceId === "inline" && (e as CustomEvent<string>).detail === "dialog-closed") apply();
    };
    window.addEventListener(DRAFT_EVENT, onOther);
    return () => window.removeEventListener(DRAFT_EVENT, onOther);
  }, [reset, instanceId, loadOffers]);

  // Entwurf speichern
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      if (!restoredRef.current) return;
      try {
        const { website: _w, ...values } = getValues();
        void _w;
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ values, step, maxStep }));
        window.dispatchEvent(new CustomEvent(DRAFT_EVENT, { detail: instanceId }));
      } catch {}
    };
    const unsubscribe = subscribe({
      formState: { values: true },
      callback: () => {
        clearTimeout(t);
        t = setTimeout(save, 300);
      },
    });
    save();
    return () => {
      clearTimeout(t);
      unsubscribe();
    };
  }, [subscribe, getValues, instanceId, step, maxStep]);


  useEffect(() => {
    if (!getValues("startedAt")) setValue("startedAt", Date.now());
    const applyPreselect = (d: PreselectDetail) => {
      if (d.tripType) setValue("tripType", d.tripType);
      if (d.vehicleClass && vehicles.some((v) => v.slug === d.vehicleClass && v.enabled)) setValue("vehicleClass", d.vehicleClass as VehicleSlug);
    };
    try {
      const raw = sessionStorage.getItem(PRESELECT_EVENT);
      if (raw) {
        applyPreselect(JSON.parse(raw) as PreselectDetail);
        sessionStorage.removeItem(PRESELECT_EVENT);
      }
    } catch {}
    const onPre = (e: Event) => {
      applyPreselect((e as CustomEvent<PreselectDetail>).detail);
      try {
        sessionStorage.removeItem(PRESELECT_EVENT);
      } catch {}
    };
    window.addEventListener(PRESELECT_EVENT, onPre);
    return () => window.removeEventListener(PRESELECT_EVENT, onPre);
  }, [setValue, getValues, vehicles]);

  const applyIssues = useCallback(
    (issues: z.core.$ZodIssue[] | { path: string; message: string }[]) => {
      let first: string | null = null;
      const seen = new Set<string>();
      for (const issue of issues) {
        const path = Array.isArray(issue.path) ? issue.path.join(".") : String(issue.path);
        if (!path || seen.has(path)) continue;
        seen.add(path);
        setError(path as FieldPath<BookingFormValues>, { type: "validate", message: issue.message });
        first ??= path;
      }
      return first;
    },
    [setError],
  );

  const validateStep = useCallback(
    (s: number) => {
      const schema = [tripStepSchema, vehicleStepSchema, customerStepSchema][s];
      if (!schema) return true;
      clearErrors(STEP_FIELDS[s]);
      const values = getValues();
      const r = schema.safeParse(values);
      if (r.success) return true;
      const own = r.error.issues.filter((i) => stepOfField(String(i.path[0] ?? "")) === s || s === 1);
      const first = applyIssues(own.length ? own : r.error.issues);
      if (first) {
        try {
          setFocus(first as FieldPath<BookingFormValues>);
        } catch {}
      }
      return false;
    },
    [applyIssues, clearErrors, getValues, setFocus],
  );

  const goTo = (s: number) => {
    setDir(s > step ? 1 : -1);
    setStep(s);
    setFormError(null);
    requestAnimationFrame(() => document.getElementById(anchorId)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  };

  const next = () => {
    if (!validateStep(step)) return;
    const n = Math.min(3, step + 1);
    if (step === 0) void loadOffers();
    setMaxStep((m) => Math.max(m, n));
    goTo(n);
  };

  const onSubmit = async (values: BookingFormValues) => {
    setFormError(null);
    const parsed = bookingSchema.safeParse(values);
    if (!parsed.success) {
      const first = applyIssues(parsed.error.issues);
      if (first) goTo(stepOfField(first));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, durationHours: values.tripType === "HOURLY" ? values.durationHours : undefined, payNow: selectedOffer?.payable === true }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; reference?: string; customerMail?: string; checkoutUrl?: string; paymentError?: boolean; message?: string; fieldErrors?: Record<string, string> };
      if (res.ok && json.ok && json.reference) {
        try {
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {}
        if (json.checkoutUrl && /^https:\/\/checkout\.stripe\.com\//.test(json.checkoutUrl)) {
          window.location.assign(json.checkoutUrl);
          return;
        }
        router.push(`/anfrage/eingegangen?nr=${encodeURIComponent(json.reference)}&m=${json.customerMail === "sent" ? "1" : "0"}${json.paymentError ? "&zahlung=fehler" : ""}`);
        return;
      }
      if (json.fieldErrors) {
        const issues = Object.entries(json.fieldErrors).map(([path, message]) => ({ path, message }));
        const first = applyIssues(issues);
        if (first) goTo(stepOfField(first));
      }
      setFormError(json.message ?? "Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.");
    } catch {
      setFormError("Keine Verbindung. Bitte prüfen Sie Ihre Internetverbindung oder rufen Sie uns an.");
    } finally {
      setSubmitting(false);
    }
  };

  const vehicleClass = useWatch({ control, name: "vehicleClass" });
  const selectedOffer = offers?.find((o) => o.slug === vehicleClass);
  const payMode = selectedOffer?.payable === true && !!selectedOffer.price;

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -40 }),
  };

  return (
    <FormProvider {...methods}>
      <div className="@container">
      <div id={anchorId} className="scroll-mt-28" />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-10 @5xl:grid-cols-12 @5xl:gap-14" aria-label="Buchungsanfrage">
        {/* Fortschritt */}
        <aside className="@5xl:col-span-3">
          <ol className="grid grid-cols-4 gap-2 @5xl:sticky @5xl:top-32 @5xl:grid-cols-1 @5xl:gap-0" aria-label="Fortschritt">
            {STEPS.map((label, i) => {
              const done = i < step;
              const current = i === step;
              const reachable = i <= maxStep;
              return (
                <li key={label} className="relative @5xl:pb-9 @5xl:last:pb-0">
                  {i < STEPS.length - 1 && (
                    <span aria-hidden className="absolute left-[1.1rem] top-11 hidden h-[calc(100%-2.75rem)] w-px bg-white/10 @5xl:block">
                      <motion.span className="block w-px origin-top bg-gold" initial={false} animate={{ scaleY: done ? 1 : 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} style={{ height: "100%" }} />
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={!reachable || current}
                    onClick={() => goTo(i)}
                    aria-current={current ? "step" : undefined}
                    className="group flex w-full flex-col items-start gap-2 text-left disabled:cursor-default @5xl:flex-row @5xl:items-center @5xl:gap-4"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs transition-all duration-500 ${
                        current ? "border-gold bg-gold text-ink" : done ? "border-gold text-gold" : "border-white/20 text-mist"
                      }`}
                    >
                      {done ? <CheckIcon size={16} /> : i + 1}
                    </span>
                    <span className={`text-[0.62rem] font-semibold uppercase tracking-[0.2em] sm:text-[0.68rem] ${current ? "text-ivory" : "text-mist"}`}>{label}</span>
                  </button>
                  <span aria-hidden className="mt-3 block h-px w-full bg-white/10 @5xl:hidden">
                    <motion.span className="block h-px origin-left bg-gold" initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} transition={{ duration: 0.7 }} />
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-10 hidden border-t border-white/[0.08] pt-8 text-sm leading-relaxed text-mist @5xl:block">
            <p>Lieber persönlich?</p>
            <a href={telHref} className="mt-2 block font-display text-2xl text-ivory hover:text-gold">
              {company.phone.display}
            </a>
          </div>
        </aside>

        <div className="relative min-w-0 @5xl:col-span-9">
          {/* Honeypot (für Menschen unsichtbar) */}
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="bk-website">Website</label>
            <input id="bk-website" type="text" tabIndex={-1} autoComplete="off" {...methods.register("website")} />
          </div>

          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              {step === 0 && <TripStep placesEnabled={placesEnabled} />}
              {step === 1 && <VehicleStep vehicles={vehicles} offers={offers} loading={offersLoading} />}
              {step === 2 && <CustomerStep />}
              {step === 3 && <SummaryStep vehicles={vehicles} onEdit={goTo} offer={selectedOffer} />}
            </motion.div>
          </AnimatePresence>

          {formError && (
            <div role="alert" className="mt-8 border border-error/40 bg-error/[0.06] px-5 py-4 text-sm leading-relaxed text-ivory">
              {formError}{" "}
              <a href={telHref} className="whitespace-nowrap text-gold underline-offset-4 hover:underline">
                {company.phone.display}
              </a>
            </div>
          )}

          <div className="mt-12 flex flex-col-reverse gap-3 border-t border-white/[0.08] pt-8 sm:flex-row sm:items-center sm:justify-between">
            {step > 0 ? (
              <button type="button" onClick={() => goTo(step - 1)} className="btn btn-ghost">
                <ArrowLeftIcon size={16} /> Zurück
              </button>
            ) : (
              <span className="hidden text-xs text-mist sm:block">Schritt 1 von 4 · Unverbindliche Anfrage</span>
            )}
            {step < 3 ? (
              <button key="next" type="button" onClick={next} className="btn btn-gold">
                Weiter <ArrowRightIcon size={16} />
              </button>
            ) : (
              <button key="submit" type="submit" className="btn btn-gold" disabled={submitting} aria-busy={submitting}>
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" aria-hidden /> {payMode ? "Weiterleitung zur Zahlung …" : "Wird gesendet …"}
                  </>
                ) : (
                  <>
                    {payMode ? `Jetzt sicher bezahlen · ${euro(selectedOffer!.price!.amount)}` : "Unverbindliches Angebot anfordern"} <ArrowRightIcon size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
      </div>
    </FormProvider>
  );
}

/* ───────────── Schritt 1 – Fahrt ───────────── */

function StepTitle({ no, title, text }: { no: string; title: string; text: string }) {
  return (
    <div className="mb-10">
      <p className="eyebrow">Schritt {no}</p>
      <h3 className="display mt-3 text-[2rem] @xl:text-[2.4rem]">{title}</h3>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist">{text}</p>
    </div>
  );
}

function Collapse({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="pt-6">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TripStep({ placesEnabled }: { placesEnabled: boolean }) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<BookingFormValues>();
  const tripType = useWatch({ control, name: "tripType" });
  const pickupDate = useWatch({ control, name: "pickupDate" });
  const { fields, append, remove } = useFieldArray({ control, name: "stops" });
  const today = useSyncExternalStore(noopSubscribe, () => berlinNow().date, () => "");
  const [showExtra, setShowExtra] = useState(false);


  return (
    <div>
      <StepTitle no="1 von 4" title="Ihre Fahrt" text="Wohin dürfen wir Sie bringen? Alle Angaben dienen der Planung und werden persönlich geprüft." />

      <fieldset>
        <legend className="field-label">Fahrtart</legend>
        <Controller
          control={control}
          name="tripType"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Fahrtart" className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
              {tripTypes.map((t) => {
                const Icon = tripIcons[t];
                const active = field.value === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => field.onChange(t)}
                    className={`flex min-h-[4.5rem] flex-col items-start justify-between gap-3 border px-4 py-3.5 text-left text-sm transition-all duration-500 ${
                      active ? "border-gold bg-gold/[0.08] text-ivory" : "border-line bg-ink/40 text-ivory/70 hover:border-white/25"
                    }`}
                  >
                    <Icon size={18} className={active ? "text-gold" : "text-mist"} />
                    {tripTypeLabels[t]}
                  </button>
                );
              })}
            </div>
          )}
        />
      </fieldset>

      <div className="mt-8 grid gap-6 @xl:grid-cols-2">
        <Field label="Abholadresse" htmlFor="pickupAddress" error={errors.pickupAddress?.message} className="@xl:col-span-2">
          <Controller
            control={control}
            name="pickupAddress"
            render={({ field }) => (
              <AddressInput
                id="pickupAddress"
                value={field.value}
                onChange={field.onChange}
                onSelectPlace={(id) => setValue("pickupPlaceId", id)}
                enabled={placesEnabled}
                placeholder={tripType === "AIRPORT" ? "z. B. Hotel, Wohnadresse oder Flughafen Terminal" : "Straße, Hausnummer, Ort"}
                error={errors.pickupAddress?.message}
                icon={<PinIcon size={18} />}
              />
            )}
          />
        </Field>

        <Field
          label="Zieladresse"
          htmlFor="dropoffAddress"
          optional={tripType === "HOURLY"}
          error={errors.dropoffAddress?.message}
          className="@xl:col-span-2"
          hint={tripType === "HOURLY" ? "Bei Stundenbuchungen können Sie das Ziel auch offen lassen." : undefined}
        >
          <Controller
            control={control}
            name="dropoffAddress"
            render={({ field }) => (
              <AddressInput
                id="dropoffAddress"
                value={field.value}
                onChange={field.onChange}
                onSelectPlace={(id) => setValue("dropoffPlaceId", id)}
                enabled={placesEnabled}
                placeholder="Straße, Hausnummer, Ort"
                error={errors.dropoffAddress?.message}
                icon={<FlagIcon size={18} />}
              />
            )}
          />
        </Field>

        {/* Zwischenstopps */}
        <div className="@xl:col-span-2">
          <AnimatePresence initial={false}>
            {fields.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="pb-4">
                  <label htmlFor={`stop-${i}`} className="field-label">
                    Zwischenstopp {i + 1}
                  </label>
                  <div className="flex gap-2">
                    <input id={`stop-${i}`} className="field" placeholder="Adresse des Zwischenstopps" {...register(`stops.${i}.address` as const)} />
                    <button type="button" onClick={() => remove(i)} className="flex w-[3.25rem] shrink-0 items-center justify-center border border-line text-mist hover:border-error hover:text-error" aria-label={`Zwischenstopp ${i + 1} entfernen`}>
                      <CloseIcon size={18} />
                    </button>
                  </div>
                  {errors.stops?.[i]?.address?.message && <p className="field-error">{errors.stops[i]?.address?.message}</p>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {fields.length < MAX_STOPS && (
            <button type="button" onClick={() => append({ address: "" })} className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold hover:text-gold-soft">
              <PlusIcon size={16} /> Zwischenstopp hinzufügen <span className="font-normal normal-case tracking-normal text-mist">(optional)</span>
            </button>
          )}
        </div>

        <Field label="Datum" htmlFor="pickupDate" error={errors.pickupDate?.message}>
          <div className="relative">
            <CalendarIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gold" />
            <input id="pickupDate" type="date" min={today || undefined} className="field pl-11" aria-invalid={!!errors.pickupDate} {...register("pickupDate")} />
          </div>
        </Field>
        <Field label="Uhrzeit" htmlFor="pickupTime" error={errors.pickupTime?.message}>
          <div className="relative">
            <ClockIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gold" />
            <input id="pickupTime" type="time" step={300} className="field pl-11" aria-invalid={!!errors.pickupTime} {...register("pickupTime")} />
          </div>
        </Field>
      </div>

      <Collapse show={tripType === "ROUND_TRIP"}>
        <div className="grid gap-6 border-l border-gold/40 pl-5 @xl:grid-cols-2">
          <Field label="Rückfahrtdatum" htmlFor="returnDate" error={errors.returnDate?.message}>
            <input id="returnDate" type="date" min={pickupDate || today || undefined} className="field" aria-invalid={!!errors.returnDate} {...register("returnDate")} />
          </Field>
          <Field label="Rückfahrtszeit" htmlFor="returnTime" error={errors.returnTime?.message}>
            <input id="returnTime" type="time" step={300} className="field" aria-invalid={!!errors.returnTime} {...register("returnTime")} />
          </Field>
        </div>
      </Collapse>

      <Collapse show={tripType === "HOURLY"}>
        <div className="border-l border-gold/40 pl-5">
          <Field label="Gewünschte Dauer" htmlFor="durationHours" error={errors.durationHours?.message}>
            <select id="durationHours" className="field max-w-xs" {...register("durationHours", { valueAsNumber: true })}>
              {Array.from({ length: MAX_HOURS }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {h} {h === 1 ? "Stunde" : "Stunden"}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Collapse>

      <Collapse show={tripType === "AIRPORT"}>
        <div className="border-l border-gold/40 pl-5">
          <Field label="Flugnummer" htmlFor="flightNumber" optional error={errors.flightNumber?.message} hint="Hilft uns, die Abholung auf Ihren Flug abzustimmen.">
            <input id="flightNumber" className="field max-w-xs uppercase" placeholder="z. B. LH 2034" autoComplete="off" {...register("flightNumber")} />
          </Field>
        </div>
      </Collapse>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Controller
          control={control}
          name="passengers"
          render={({ field }) => <Stepper id="passengers" label="Personen" value={field.value} min={1} max={MAX_PASSENGERS} onChange={field.onChange} icon={<UsersIcon size={18} />} error={errors.passengers?.message} />}
        />
        <Controller
          control={control}
          name="luggage"
          render={({ field }) => <Stepper id="luggage" label="Gepäckstücke" value={field.value} min={0} max={MAX_LUGGAGE} onChange={field.onChange} icon={<SuitcaseIcon size={18} />} error={errors.luggage?.message} />}
        />
      </div>
      <p className="mt-3 text-xs text-mist">Für größere Gruppen oder besondere Gepäckmengen kontaktieren Sie uns bitte direkt.</p>

      <div className="mt-8">
        <button type="button" onClick={() => setShowExtra((s) => !s)} aria-expanded={showExtra || tripType === "AIRPORT"} className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ivory/80 hover:text-gold">
          <PlusIcon size={16} className={`transition-transform duration-500 ${showExtra ? "rotate-45" : ""}`} /> Weitere Angaben
        </button>
        <Collapse show={showExtra}>
          <div className="grid gap-6">
            {tripType !== "AIRPORT" && (
              <Field label="Flugnummer" htmlFor="flightNumber2" optional error={errors.flightNumber?.message}>
                <input id="flightNumber2" className="field max-w-xs uppercase" placeholder="z. B. LH 2034" autoComplete="off" {...register("flightNumber")} />
              </Field>
            )}
            <Field label="Besondere Hinweise zur Fahrt" htmlFor="tripNotes" optional error={errors.tripNotes?.message}>
              <textarea id="tripNotes" rows={3} className="field resize-y" placeholder="z. B. Kindersitz gewünscht, Treffpunkt, Ablauf …" {...register("tripNotes")} />
            </Field>
          </div>
        </Collapse>
      </div>
    </div>
  );
}

/* ───────────── Schritt 2 – Fahrzeug ───────────── */

function VehicleStep({ vehicles, offers, loading }: { vehicles: BookingVehicle[]; offers: VehicleOfferView[] | null; loading: boolean }) {
  const {
    control,
    formState: { errors },
  } = useFormContext<BookingFormValues>();
  const passengers = useWatch({ control, name: "passengers" });
  const luggage = useWatch({ control, name: "luggage" });
  const anyUnconfirmed = vehicles.some((v) => !v.confirmed);

  return (
    <div>
      <StepTitle no="2 von 4" title="Ihr Fahrzeug" text="Wählen Sie Ihre bevorzugte Fahrzeugklasse. Die Verfügbarkeit bestätigen wir Ihnen persönlich." />
      {anyUnconfirmed && (
        <p className="mb-6 flex items-start gap-3 text-xs leading-relaxed text-mist">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
          Vorgeschlagene Flottenkonfiguration – keine garantierte Verfügbarkeit. Bilder sind Symbolbilder.
        </p>
      )}
      <Controller
        control={control}
        name="vehicleClass"
        render={({ field }) => (
          <div role="radiogroup" aria-label="Fahrzeugklasse" aria-describedby={errors.vehicleClass ? "vehicleClass-error" : undefined} className="grid gap-4 @4xl:grid-cols-3">
            {vehicles.map((v) => {
              const active = field.value === v.slug;
              const tooSmall = passengers > v.passengers || luggage > v.luggage;
              const disabled = !v.enabled;
              return (
                <button
                  key={v.slug}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => field.onChange(v.slug)}
                  className={`group relative flex flex-col overflow-hidden border text-left transition-all duration-500 @lg:flex-row @4xl:flex-col disabled:cursor-not-allowed disabled:opacity-40 ${
                    active ? "border-gold bg-gold/[0.05] shadow-[0_0_0_1px_var(--color-gold)]" : "border-line bg-ink/40 hover:border-white/25"
                  }`}
                >
                  <span className="relative block aspect-[16/10] shrink-0 overflow-hidden @lg:aspect-auto @lg:min-h-[12rem] @lg:w-[42%] @4xl:aspect-[16/10] @4xl:min-h-0 @4xl:w-full">
                    <Image src={vehicleImages[v.slug]} alt={v.imageAlt} fill sizes="(min-width: 768px) 28vw, 100vw" className={`object-cover ${v.imagePosition ?? ""} transition-transform duration-[1.4s] ease-[var(--ease-lux)] group-hover:scale-[1.04] ${active ? "" : "brightness-75"}`} />
                    <span className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" aria-hidden />
                    <span className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-500 ${active ? "border-gold bg-gold text-ink" : "border-white/40 bg-ink/50 text-transparent"}`}>
                      <CheckIcon size={16} />
                    </span>
                    {v.imageNote && <span className="absolute bottom-2 left-3 text-[0.55rem] uppercase tracking-[0.16em] text-ivory/55">{v.imageNote}</span>}
                  </span>
                  <span className="flex flex-1 flex-col p-5">
                    <span className="eyebrow text-[0.6rem]">{v.category}</span>
                    <span className="mt-2 font-display text-[1.45rem] leading-tight text-ivory">{v.model}</span>
                    <span className="mt-4 flex gap-5 text-sm text-ivory/80">
                      <span className="flex items-center gap-2">
                        <UsersIcon size={16} className="text-gold" /> bis {v.passengers}
                      </span>
                      <span className="flex items-center gap-2">
                        <SuitcaseIcon size={16} className="text-gold" /> bis {v.luggage}
                      </span>
                    </span>
                    <span className="mt-4 block space-y-1.5 text-xs text-mist">
                      {v.features.map((f) => (
                        <span key={f} className="flex items-center gap-2">
                          <span className="h-px w-3 bg-gold/60" aria-hidden /> {f}
                        </span>
                      ))}
                    </span>
                    <span className="mt-4 block border-t border-white/[0.08] pt-3 text-xs">
                      {loading ? (
                        <span className="inline-block h-3 w-28 animate-pulse bg-white/10" aria-label="Preis wird ermittelt" />
                      ) : offers?.find((o) => o.slug === v.slug)?.price ? (
                        <span className="text-ivory">
                          <span className="font-display text-lg text-gold">{euro(offers.find((o) => o.slug === v.slug)!.price!.amount)}</span> Festpreis
                        </span>
                      ) : (
                        <span className="text-mist">Preis: individuelles Angebot</span>
                      )}
                    </span>
                    <span className="mt-auto pt-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em]">
                      {disabled ? (
                        <span className="text-mist">Derzeit nicht anfragbar</span>
                      ) : tooSmall ? (
                        <span className="text-error/90">Für Ihre Angaben zu klein</span>
                      ) : active ? (
                        <span className="text-gold">Ausgewählt</span>
                      ) : (
                        <span className="text-ivory/70 group-hover:text-ivory">Auswählen</span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      />
      {errors.vehicleClass?.message && (
        <p id="vehicleClass-error" className="field-error mt-4" role="alert">
          {errors.vehicleClass.message}
        </p>
      )}
      <div className="mt-8 border border-white/[0.08] bg-ink/40 p-5 text-sm leading-relaxed text-ivory/75">
        <p className="eyebrow mb-2 text-[0.6rem]">Preis</p>
        <p>
          {offers?.some((o) => o.price) ? (
            <>
              <strong className="font-medium text-ivory">Festpreis inklusive.</strong> Der angezeigte Preis wurde serverseitig für Ihre Strecke berechnet.
            </>
          ) : (
            <>
              <strong className="font-medium text-ivory">Unverbindliches Angebot anfordern.</strong> Nach Prüfung Ihrer Anfrage erhalten Sie ein persönliches Angebot für Ihre Fahrt.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/* ───────────── Schritt 3 – Kontakt ───────────── */

function CustomerStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<BookingFormValues>();
  return (
    <div>
      <StepTitle no="3 von 4" title="Ihre Kontaktdaten" text="Damit wir Ihnen die Verfügbarkeit bestätigen und Ihr Angebot senden können." />
      <div className="grid gap-6 @xl:grid-cols-2">
        <Field label="Vorname" htmlFor="firstName" error={errors.firstName?.message}>
          <input id="firstName" className="field" autoComplete="given-name" aria-invalid={!!errors.firstName} {...register("firstName")} />
        </Field>
        <Field label="Nachname" htmlFor="lastName" error={errors.lastName?.message}>
          <input id="lastName" className="field" autoComplete="family-name" aria-invalid={!!errors.lastName} {...register("lastName")} />
        </Field>
        <Field label="E-Mail" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" inputMode="email" className="field" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field label="Telefonnummer" htmlFor="phone" error={errors.phone?.message}>
          <input id="phone" type="tel" inputMode="tel" className="field" autoComplete="tel" placeholder="+49 …" aria-invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <Field label="Firmenname" htmlFor="company" optional error={errors.company?.message} className="@xl:col-span-2">
          <input id="company" className="field" autoComplete="organization" {...register("company")} />
        </Field>
        <Field label="Besondere Wünsche" htmlFor="specialRequests" optional error={errors.specialRequests?.message} className="@xl:col-span-2">
          <textarea id="specialRequests" rows={3} className="field resize-y" placeholder="z. B. Getränkewünsche, Begrüßung am Gate, Musik …" {...register("specialRequests")} />
        </Field>
      </div>

      <div className="mt-8">
        <label htmlFor="privacy" className="flex cursor-pointer items-start gap-4">
          <input id="privacy" type="checkbox" className="peer sr-only" aria-invalid={!!errors.privacy} {...register("privacy")} />
          <span
            aria-hidden
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border text-ink transition-colors peer-checked:border-gold peer-checked:bg-gold peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100 ${
              errors.privacy ? "border-error" : "border-white/30"
            }`}
          >
            <CheckIcon size={15} />
          </span>
          <span className="text-sm leading-relaxed text-ivory/75">
            Ich habe die{" "}
            <Link href="/datenschutz" target="_blank" className="text-gold underline-offset-4 hover:underline">
              Datenschutzhinweise
            </Link>{" "}
            zur Kenntnis genommen. Meine Angaben werden ausschließlich zur Bearbeitung dieser Anfrage verwendet.
          </span>
        </label>
        {errors.privacy?.message && (
          <p className="field-error ml-10" role="alert">
            {errors.privacy.message}
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────────── Schritt 4 – Übersicht ───────────── */

function Row({ k, val }: { k: string; val?: string | number | null }) {
  if (val === undefined || val === null || val === "") return null;
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-4 border-b border-white/[0.06] py-3 text-sm sm:grid-cols-[11rem_1fr]">
      <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-mist">{k}</dt>
      <dd className="whitespace-pre-line break-words text-ivory">{val}</dd>
    </div>
  );
}

function Block({ title, step, children, onEdit }: { title: string; step: number; children: React.ReactNode; onEdit: (s: number) => void }) {
  return (
    <section className="border border-white/[0.08] bg-ink/40 p-5 @xl:p-6">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="eyebrow text-[0.62rem]">{title}</h4>
        <button type="button" onClick={() => onEdit(step)} className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ivory/70 underline-offset-4 hover:text-gold hover:underline">
          Ändern
        </button>
      </div>
      <dl>{children}</dl>
    </section>
  );
}

function SummaryStep({ vehicles, onEdit, offer }: { vehicles: BookingVehicle[]; onEdit: (s: number) => void; offer?: VehicleOfferView }) {
  const { control } = useFormContext<BookingFormValues>();
  const v = useWatch({ control }) as BookingFormValues;
  const vehicle = vehicles.find((x) => x.slug === v.vehicleClass);
  const stops = (v.stops ?? []).map((s) => s.address).filter(Boolean);

  const waText = useMemo(
    () =>
      whatsappTripMessage({
        tripType: v.tripType,
        pickupAddress: v.pickupAddress,
        dropoffAddress: v.dropoffAddress,
        pickupDate: v.pickupDate,
        pickupTime: v.pickupTime,
        passengers: v.passengers,
        luggage: v.luggage,
        vehicleClass: v.vehicleClass || undefined,
        durationHours: v.tripType === "HOURLY" ? v.durationHours : undefined,
        returnDate: v.returnDate,
        returnTime: v.returnTime,
      }),
    [v],
  );

  return (
    <div>
      <StepTitle no="4 von 4" title="Ihre Anfrage im Überblick" text="Bitte prüfen Sie Ihre Angaben vor dem Absenden." />
      <div className="grid gap-4">
        <Block title="Fahrt" step={0} onEdit={onEdit}>
          <Row k="Fahrtart" val={tripTypeLabels[v.tripType]} />
          <Row k="Abholung" val={v.pickupAddress} />
          <Row k="Ziel" val={v.dropoffAddress || (v.tripType === "HOURLY" ? "nach Absprache" : "")} />
          <Row k="Zwischenstopps" val={stops.join("\n")} />
          <Row k="Datum & Uhrzeit" val={v.pickupDate ? `${formatDateDe(v.pickupDate)}, ${v.pickupTime} Uhr` : ""} />
          {v.tripType === "ROUND_TRIP" && <Row k="Rückfahrt" val={v.returnDate ? `${formatDateDe(v.returnDate)}, ${v.returnTime} Uhr` : ""} />}
          {v.tripType === "HOURLY" && <Row k="Dauer" val={`${v.durationHours} ${v.durationHours === 1 ? "Stunde" : "Stunden"}`} />}
          <Row k="Personen / Gepäck" val={`${v.passengers} Person(en) · ${v.luggage} Gepäckstück(e)`} />
          <Row k="Flugnummer" val={v.flightNumber?.toUpperCase()} />
          <Row k="Hinweise" val={v.tripNotes} />
        </Block>
        <Block title="Fahrzeug" step={1} onEdit={onEdit}>
          <Row k="Fahrzeugklasse" val={vehicle ? `${vehicle.model} · ${vehicle.category}` : "–"} />
          <Row k="Preis" val={offer?.price ? `${euro(offer.price.amount)} (Festpreis)` : "Individuelles Angebot"} />
        </Block>
        <Block title="Kontakt" step={2} onEdit={onEdit}>
          <Row k="Name" val={`${v.firstName} ${v.lastName}`} />
          <Row k="E-Mail" val={v.email} />
          <Row k="Telefon" val={v.phone} />
          <Row k="Firma" val={v.company} />
          <Row k="Besondere Wünsche" val={v.specialRequests} />
        </Block>
      </div>

      <div className="mt-8 space-y-3 text-xs leading-relaxed text-mist">
        <p>
          {offer?.payable && offer.price ? (
            <>
              <span className="text-ivory/80">Sichere Zahlung:</span> Sie werden zu unserem Zahlungsdienstleister Stripe weitergeleitet (Kreditkarte, Debitkarte, Apple Pay, Google
              Pay – je nach Gerät). Ihre Kartendaten werden nicht auf unseren Servern gespeichert. Nach erfolgreicher Zahlung erhalten Sie Ihre Buchungsbestätigung per E-Mail.
            </>
          ) : (
            <>
              <span className="text-ivory/80">Wichtig:</span> Sie fordern ein unverbindliches Angebot an. Ihre Fahrt gilt erst als gebucht, wenn wir sie Ihnen ausdrücklich bestätigt
              haben. Es erfolgt keine Zahlung.
            </>
          )}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          Lieber per WhatsApp?
          <a href={whatsappHref(waText)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-gold underline-offset-4 hover:underline">
            <WhatsappIcon size={15} /> Fahrtdaten in WhatsApp übernehmen
          </a>
          <span>(ohne Kontaktdaten – Sie entscheiden in WhatsApp selbst, ob Sie senden).</span>
        </p>
      </div>
    </div>
  );
}
