"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { Field } from "@/components/booking/fields";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { company, mailHref } from "@/config/company";
import { contactSchema, contactSubjects } from "@/lib/validation";

interface ContactValues {
  name: string;
  email: string;
  phone: string;
  subject: (typeof contactSubjects)[number] | "";
  message: string;
  privacy: boolean;
  website: string;
  startedAt: number;
}

type Result = { kind: "sent" } | { kind: "stored" } | null;
const now = () => Date.now();

export function ContactForm() {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    defaultValues: { name: "", email: "", phone: "", subject: "", message: "", privacy: false, website: "", startedAt: 0 },
    mode: "onChange",
  });
  const [result, setResult] = useState<Result>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => setValue("startedAt", now()), [setValue]);

  const onSubmit = async (values: ContactValues) => {
    setFormError(null);
    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) setError(issue.path.join(".") as FieldPath<ContactValues>, { message: issue.message });
      return;
    }
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; delivery?: string; message?: string; fieldErrors?: Record<string, string> };
      if (res.ok && json.ok) {
        setResult(json.delivery === "sent" ? { kind: "sent" } : { kind: "stored" });
        reset({ name: "", email: "", phone: "", subject: "", message: "", privacy: false, website: "", startedAt: now() });
        return;
      }
      if (json.fieldErrors) for (const [k, m] of Object.entries(json.fieldErrors)) setError(k as FieldPath<ContactValues>, { message: m });
      setFormError(json.message ?? "Ihre Nachricht konnte nicht gesendet werden.");
    } catch {
      setFormError("Keine Verbindung. Bitte versuchen Sie es erneut.");
    }
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {result ? (
          <motion.div key="ok" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="py-10" role="status">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold text-gold">
              <CheckIcon size={24} />
            </span>
            <h3 className="display mt-8 text-[2rem]">Vielen Dank für Ihre Nachricht.</h3>
            <p className="mt-4 max-w-md leading-relaxed text-ivory/75">
              {result.kind === "sent"
                ? "Ihre Nachricht wurde an uns übermittelt. Wir melden uns so bald wie möglich bei Ihnen."
                : "Ihre Nachricht ist bei uns eingegangen und wurde gespeichert. Wir melden uns so bald wie möglich bei Ihnen."}
            </p>
            <button type="button" onClick={() => setResult(null)} className="btn btn-ghost mt-8">
              Weitere Nachricht
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Kontaktformular" className="grid gap-6 md:grid-cols-2">
            <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="ct-website">Website</label>
              <input id="ct-website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
            </div>
            <Field label="Vollständiger Name" htmlFor="ct-name" error={errors.name?.message}>
              <input id="ct-name" className="field" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
            </Field>
            <Field label="E-Mail-Adresse" htmlFor="ct-email" error={errors.email?.message}>
              <input id="ct-email" type="email" inputMode="email" className="field" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
            </Field>
            <Field label="Telefonnummer" htmlFor="ct-phone" optional error={errors.phone?.message}>
              <input id="ct-phone" type="tel" inputMode="tel" className="field" autoComplete="tel" aria-invalid={!!errors.phone} {...register("phone")} />
            </Field>
            <Field label="Betreff" htmlFor="ct-subject" error={errors.subject?.message}>
              <select id="ct-subject" className="field" aria-invalid={!!errors.subject} {...register("subject")}>
                <option value="" disabled>
                  Bitte wählen …
                </option>
                {contactSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nachricht" htmlFor="ct-message" error={errors.message?.message} className="md:col-span-2">
              <textarea id="ct-message" rows={6} className="field resize-y" aria-invalid={!!errors.message} {...register("message")} />
            </Field>
            <div className="md:col-span-2">
              <label htmlFor="ct-privacy" className="flex cursor-pointer items-start gap-4">
                <input id="ct-privacy" type="checkbox" className="peer sr-only" aria-invalid={!!errors.privacy} {...register("privacy")} />
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
                  zur Kenntnis genommen. Meine Angaben werden zur Beantwortung meiner Anfrage verwendet.
                </span>
              </label>
              {errors.privacy?.message && <p className="field-error ml-10">{errors.privacy.message}</p>}
            </div>
            {formError && (
              <div role="alert" className="border border-error/40 bg-error/[0.06] px-5 py-4 text-sm text-ivory md:col-span-2">
                {formError} Alternativ erreichen Sie uns direkt unter{" "}
                <a href={mailHref} className="text-gold underline-offset-4 hover:underline">
                  {company.email}
                </a>
                .
              </div>
            )}
            <div className="md:col-span-2">
              <button type="submit" className="btn btn-gold w-full sm:w-auto" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? "Wird gesendet …" : "Nachricht senden"} <ArrowRightIcon size={16} />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
