"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { vehicleSlugs } from "@/config/fleet";
import { SESSION_COOKIE, checkCredentials, createSessionToken, isAdminConfigured, requireAdmin, sessionCookieOptions } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/rate-limit";
import { bookingStatuses } from "@/lib/validation";

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) return { error: "Der Adminbereich ist noch nicht eingerichtet (ADMIN_PASSWORD_HASH / ADMIN_SESSION_SECRET fehlen)." };
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
  const limit = rateLimit(`login:${ip}`, 8, 15 * 60 * 1000);
  if (!limit.ok) return { error: `Zu viele Anmeldeversuche. Bitte in ${Math.ceil(limit.retryAfter / 60)} Minuten erneut versuchen.` };

  const username = String(formData.get("username") ?? "").slice(0, 100);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  if (!checkCredentials(username, password)) {
    await new Promise((r) => setTimeout(r, 400));
    return { error: "Benutzername oder Passwort ist falsch." };
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(username), sessionCookieOptions);
  redirect("/admin");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

const statusSchema = z.object({
  id: z.string().min(1).max(40),
  status: z.enum(bookingStatuses),
  note: z.string().trim().max(1000).optional(),
});

export async function updateBookingStatus(formData: FormData) {
  const session = await requireAdmin();
  const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status"), note: formData.get("note") || undefined });
  if (!parsed.success) throw new Error("Ungültige Eingabe.");
  const { id, status, note } = parsed.data;
  const current = await db().bookingRequest.findUnique({ where: { id }, select: { status: true } });
  if (!current) throw new Error("Anfrage nicht gefunden.");
  if (current.status !== status || note) {
    await db().bookingRequest.update({
      where: { id },
      data: {
        status,
        statusHistory: { create: { fromStatus: current.status, toStatus: status, note, changedBy: session.username } },
      },
    });
  }
  revalidatePath(`/admin/anfragen/${id}`);
  revalidatePath("/admin");
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
