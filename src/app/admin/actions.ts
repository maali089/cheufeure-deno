"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { vehicleSlugs } from "@/config/fleet";
import { adminUsername, checkAndConsumeTotp, checkCredentials, endAdminSession, isAdminConfigured, mfaStatus, requireAdmin, startAdminSession } from "@/lib/server/auth";
import { db, isDatabaseConfigured } from "@/lib/server/db";
import { logError } from "@/lib/server/log";
import { rateLimit } from "@/lib/server/rate-limit";
import { clientIpFromHeaders } from "@/lib/server/request-guard";
import { bookingConfirmedCustomerMail } from "@/lib/mail/templates";
import { mailConfig, sendMail } from "@/lib/mail/transport";
import { MAX_AGREED_PRICE, formatEuro, parseEuro } from "@/lib/price";
import { bookingStatuses } from "@/lib/validation";

export type LoginState = { error?: string } | undefined;

const GENERIC_LOGIN_ERROR = "Anmeldung fehlgeschlagen. Bitte Benutzername, Passwort und Bestätigungscode prüfen.";

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) return { error: "Der Adminbereich ist noch nicht eingerichtet (ADMIN_PASSWORD_HASH / ADMIN_SESSION_SECRET fehlen)." };
  if (!isDatabaseConfigured()) return { error: "Der Adminbereich benötigt eine Datenbankverbindung (SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD)." };
  const mfa = mfaStatus();
  if (mfa === "required") return { error: "Zwei-Faktor-Anmeldung ist vorgeschrieben, aber nicht eingerichtet (ADMIN_TOTP_SECRET fehlt, siehe SECURITY_AUDIT.md)." };

  const ip = clientIpFromHeaders(await headers());
  // Pro IP und zusätzlich global für das Admin-Konto (verteilte Brute-Force-Versuche)
  const perIp = await rateLimit(`login:ip:${ip}`, 8, 15 * 60 * 1000);
  const global = perIp.ok ? await rateLimit("login:account", 100, 15 * 60 * 1000) : perIp;
  if (!perIp.ok || !global.ok) {
    const wait = Math.max(perIp.retryAfter, global.retryAfter);
    return { error: `Zu viele Anmeldeversuche. Bitte in ${Math.max(1, Math.ceil(wait / 60))} Minuten erneut versuchen.` };
  }

  const username = String(formData.get("username") ?? "").slice(0, 100);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  const code = String(formData.get("totp") ?? "").slice(0, 12);
  const credentialsOk = checkCredentials(username, password);
  let ok = credentialsOk;
  try {
    if (ok && mfa === "enabled") ok = await checkAndConsumeTotp(adminUsername(), code);
  } catch (e) {
    logError("admin", e, "2FA-Prüfung");
    return { error: "Anmeldung ist gerade nicht möglich. Bitte später erneut versuchen." };
  }
  if (!ok) {
    await new Promise((r) => setTimeout(r, 400));
    return { error: GENERIC_LOGIN_ERROR };
  }
  try {
    await startAdminSession(adminUsername());
  } catch (e) {
    logError("admin", e, "Sitzung anlegen");
    return { error: "Anmeldung ist gerade nicht möglich. Bitte später erneut versuchen." };
  }
  redirect("/admin");
}

export async function logoutAction() {
  await endAdminSession();
  redirect("/admin/login");
}

export type ActionState = { ok?: string; error?: string } | undefined;

const idSchema = z.string().regex(/^[a-z0-9]{10,40}$/i);
const noteSchema = z.string().trim().max(1000).optional();
type BookingStatusValue = (typeof bookingStatuses)[number];
const FINAL: BookingStatusValue[] = ["REJECTED", "COMPLETED", "CANCELLED"];

function refresh(id: string) {
  revalidatePath(`/admin/anfragen/${id}`);
  revalidatePath("/admin");
}

/** Status manuell ändern (z. B. „In Bearbeitung“, „Abgelehnt“, „Abgeschlossen“). */
export async function updateBookingStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = z
    .object({ id: idSchema, status: z.enum(bookingStatuses), note: noteSchema })
    .safeParse({ id: formData.get("id"), status: formData.get("status"), note: formData.get("note") || undefined });
  if (!parsed.success) return { error: "Ungültige Eingabe." };
  const { id, status, note } = parsed.data;
  try {
    const current = await db().bookingRequest.findUnique({ where: { id }, select: { status: true, agreedPrice: true, paymentStatus: true, confirmedAt: true } });
    if (!current) return { error: "Anfrage nicht gefunden." };
    // „Bestätigt“ nur mit vereinbartem Preis (oder Online-Zahlung) – sonst über „Fahrt bestätigen“
    if (status === "CONFIRMED" && current.status !== "CONFIRMED" && !current.agreedPrice && current.paymentStatus !== "PAID") {
      return { error: "Bitte zuerst den vereinbarten Preis eintragen und dann „Fahrt bestätigen“ verwenden." };
    }
    if (current.status === status && !note) return { ok: "Keine Änderung." };
    await db().bookingRequest.update({
      where: { id },
      data: {
        status,
        ...(status === "CONFIRMED" && !current.confirmedAt ? { confirmedAt: new Date() } : {}),
        statusHistory: { create: { fromStatus: current.status, toStatus: status, note, changedBy: session.username } },
      },
    });
  } catch (e) {
    logError("admin", e, "Status ändern");
    return { error: "Speichern ist gerade nicht möglich. Bitte erneut versuchen." };
  }
  refresh(id);
  return { ok: "Status gespeichert." };
}

/** Den mit dem Fahrgast (WhatsApp/Telefon) vereinbarten Preis speichern. */
export async function saveAgreedPrice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Ungültige Eingabe." };
  const price = parseEuro(formData.get("price"));
  if (price === null) return { error: `Bitte einen gültigen Preis eingeben, z. B. 149,90 (größer als 0 und höchstens ${formatEuro(MAX_AGREED_PRICE)}).` };
  try {
    const b = await db().bookingRequest.findUnique({ where: { id: id.data }, select: { status: true, agreedPrice: true } });
    if (!b) return { error: "Anfrage nicht gefunden." };
    if (FINAL.includes(b.status)) return { error: "Für abgelehnte, stornierte oder abgeschlossene Fahrten kann kein Preis mehr eingetragen werden." };
    if (b.agreedPrice && Number(b.agreedPrice) === price) return { ok: `Preis ${formatEuro(price)} ist bereits gespeichert.` };
    const next: BookingStatusValue = b.status === "RECEIVED" ? "IN_PROGRESS" : b.status;
    const changed = b.agreedPrice ? ` (vorher ${formatEuro(b.agreedPrice)})` : "";
    await db().bookingRequest.update({
      where: { id: id.data },
      data: {
        agreedPrice: price,
        priceAgreedAt: new Date(),
        status: next,
        statusHistory: { create: { fromStatus: b.status, toStatus: next, note: `Preis vereinbart: ${formatEuro(price)}${changed}`, changedBy: session.username } },
      },
    });
    refresh(id.data);
    return { ok: b.status === "CONFIRMED" ? `Preis geändert auf ${formatEuro(price)}. Bitte dem Fahrgast die neue Bestätigung senden.` : `Preis ${formatEuro(price)} gespeichert.` };
  } catch (e) {
    logError("admin", e, "Preis speichern");
    return { error: "Speichern ist gerade nicht möglich. Bitte erneut versuchen." };
  }
}

/**
 * Fahrt nach der Preisabsprache verbindlich bestätigen – nur mit vereinbartem Preis.
 * Optional: Bestätigungs-E-Mail (Auftragsnummer + Preis) an den Fahrgast.
 */
export async function confirmBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Ungültige Eingabe." };
  const wantsMail = formData.get("sendMail") === "on";
  let b;
  try {
    b = await db().bookingRequest.findUnique({ where: { id: id.data } });
  } catch (e) {
    logError("admin", e, "Bestätigen laden");
    return { error: "Die Anfrage konnte gerade nicht geladen werden. Bitte erneut versuchen." };
  }
  if (!b) return { error: "Anfrage nicht gefunden." };
  if (b.status === "CONFIRMED") return { error: "Diese Fahrt ist bereits bestätigt." };
  if (FINAL.includes(b.status)) return { error: "Abgelehnte, stornierte oder abgeschlossene Fahrten können nicht bestätigt werden." };
  if (!b.agreedPrice) return { error: "Bitte zuerst den vereinbarten Preis eintragen und speichern." };
  const booking = b;
  const priceText = formatEuro(booking.agreedPrice!);

  try {
    // Bedingtes Update: verhindert doppelte Bestätigung (z. B. Doppelklick)
    const done = await db().$transaction(async (tx) => {
      const res = await tx.bookingRequest.updateMany({ where: { id: booking.id, status: { in: ["RECEIVED", "IN_PROGRESS"] } }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
      if (res.count !== 1) return false;
      await tx.bookingStatusChange.create({ data: { bookingId: booking.id, fromStatus: booking.status, toStatus: "CONFIRMED", note: `Fahrt bestätigt – vereinbarter Preis ${priceText}`, changedBy: session.username } });
      return true;
    });
    if (!done) return { error: "Diese Fahrt ist bereits bestätigt." };
  } catch (e) {
    logError("admin", e, "Bestätigen");
    return { error: "Die Bestätigung konnte nicht gespeichert werden. Bitte erneut versuchen." };
  }

  let mailInfo = "";
  if (wantsMail) {
    const mail = bookingConfirmedCustomerMail(booking, priceText);
    const result = await sendMail({ to: booking.email, subject: mail.subject, html: mail.html, text: mail.text, replyTo: mailConfig().replyTo });
    if (result.status === "sent") {
      await db()
        .bookingRequest.update({ where: { id: booking.id }, data: { confirmationSentAt: new Date() } })
        .catch((e) => logError("admin", e, "Mailstatus"));
      mailInfo = " Bestätigungs-E-Mail wurde versendet.";
    } else {
      mailInfo = " Achtung: Die Bestätigungs-E-Mail konnte NICHT versendet werden – bitte per WhatsApp bestätigen.";
    }
  }
  refresh(booking.id);
  return { ok: `Fahrt bestätigt (${priceText}).${mailInfo}` };
}

/** Fahrt stornieren (z. B. Absage durch den Fahrgast). */
export async function cancelBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = z.object({ id: idSchema, note: noteSchema }).safeParse({ id: formData.get("id"), note: formData.get("note") || undefined });
  if (!parsed.success) return { error: "Ungültige Eingabe." };
  try {
    const b = await db().bookingRequest.findUnique({ where: { id: parsed.data.id }, select: { status: true } });
    if (!b) return { error: "Anfrage nicht gefunden." };
    if (b.status === "CANCELLED") return { error: "Diese Fahrt ist bereits storniert." };
    if (b.status === "COMPLETED") return { error: "Abgeschlossene Fahrten können nicht storniert werden." };
    await db().bookingRequest.update({
      where: { id: parsed.data.id },
      data: { status: "CANCELLED", statusHistory: { create: { fromStatus: b.status, toStatus: "CANCELLED", note: parsed.data.note ?? "Fahrt storniert", changedBy: session.username } } },
    });
  } catch (e) {
    logError("admin", e, "Stornieren");
    return { error: "Stornieren ist gerade nicht möglich. Bitte erneut versuchen." };
  }
  refresh(parsed.data.id);
  return { ok: "Fahrt storniert. Bitte informieren Sie den Fahrgast." };
}

export async function saveAdminNotes(formData: FormData) {
  await requireAdmin();
  const id = z.string().min(1).max(40).parse(formData.get("id"));
  const notes = z.string().max(5000).parse(String(formData.get("adminNotes") ?? ""));
  await db().bookingRequest.update({ where: { id }, data: { adminNotes: notes || null } });
  revalidatePath(`/admin/anfragen/${id}`);
}

export async function toggleMessageHandled(formData: FormData) {
  await requireAdmin();
  const id = z.string().min(1).max(40).parse(formData.get("id"));
  const handled = formData.get("handled") === "true";
  await db().contactMessage.update({ where: { id }, data: { handled } });
  revalidatePath("/admin/nachrichten");
}

export async function saveFleetSetting(formData: FormData) {
  await requireAdmin();
  const slug = z.enum(vehicleSlugs).parse(formData.get("slug"));
  const enabled = formData.get("enabled") === "on";
  const confirmed = formData.get("confirmed") === "on";
  const note = z.string().trim().max(300).parse(String(formData.get("note") ?? "")) || null;
  await db().fleetSetting.upsert({ where: { slug }, create: { slug, enabled, confirmed, note }, update: { enabled, confirmed, note } });
  revalidatePath("/admin/flotte");
  revalidatePath("/");
}
