import { NextResponse } from "next/server";
import { contactOperatorMail } from "@/lib/mail/templates";
import { mailConfig, sendMail } from "@/lib/mail/transport";
import { db, isDatabaseConfigured } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/rate-limit";
import { PayloadError, clientIp, isSameOrigin, jsonError, looksLikeSpam, readJson } from "@/lib/server/request-guard";
import { contactSchema, flattenIssues } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "Ungültige Herkunft der Anfrage.");
  const limit = rateLimit(`contact:${clientIp(req)}`, 4, 10 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "Zu viele Nachrichten in kurzer Zeit. Bitte versuchen Sie es später erneut.");

  let body: unknown;
  try {
    body = await readJson(req, 12_000);
  } catch (e) {
    return jsonError(400, e instanceof PayloadError ? e.message : "Ungültige Anfrage.");
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "Bitte prüfen Sie Ihre Angaben.", flattenIssues(parsed.error));
  const data = parsed.data;

  if (data.website) return NextResponse.json({ ok: true, delivery: "sent" }); // Honeypot
  if (looksLikeSpam(data)) return jsonError(400, "Die Nachricht konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.");

  const mail = contactOperatorMail(data);
  const result = await sendMail({ to: mailConfig().operatorTo, subject: mail.subject, html: mail.html, text: mail.text, replyTo: data.email });

  // Zusätzlich speichern (sofern Datenbank vorhanden), damit keine Nachricht verloren geht.
  let stored = false;
  if (isDatabaseConfigured()) {
    try {
      await db().contactMessage.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          subject: data.subject,
          message: data.message,
          emailSentAt: result.status === "sent" ? new Date() : null,
          emailError: result.status === "sent" ? null : result.status === "failed" ? result.error.slice(0, 500) : result.status,
        },
      });
      stored = true;
    } catch (e) {
      console.error("[contact] Speichern fehlgeschlagen:", e instanceof Error ? e.message : e);
    }
  }

  if (result.status === "sent") return NextResponse.json({ ok: true, delivery: "sent" });
  console.warn(`[contact] E-Mail nicht versendet (${result.status}).`);
  if (stored) return NextResponse.json({ ok: true, delivery: "stored" });
  return jsonError(503, "Ihre Nachricht konnte gerade nicht übermittelt werden. Bitte schreiben Sie uns direkt per E-Mail oder rufen Sie uns an.");
}
