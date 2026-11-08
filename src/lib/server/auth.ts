import "server-only";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db, isDatabaseConfigured } from "./db";
import { logError } from "./log";
import { verifyPassword } from "./password";
import { SESSION_COOKIE, SESSION_IDLE_S, SESSION_TTL_S, createSessionToken, sessionIdHash, verifySessionToken } from "./session-token";
import { verifyTotp } from "./totp";

export { SESSION_COOKIE, isAdminConfigured } from "./session-token";

export const adminUsername = () => process.env.ADMIN_USERNAME || "deeno";

export function checkCredentials(username: string, password: string) {
  const expectedUser = adminUsername();
  const userOk = Buffer.from(username).length === Buffer.from(expectedUser).length && timingSafeEqual(Buffer.from(username), Buffer.from(expectedUser));
  const passOk = verifyPassword(password, process.env.ADMIN_PASSWORD_HASH); // immer ausführen (Timing)
  return userOk && passOk;
}

/**
 * Zwei-Faktor-Anmeldung (TOTP):
 *  - "enabled":  ADMIN_TOTP_SECRET gesetzt → Code ist Pflicht
 *  - "required": Produktion ohne ADMIN_TOTP_SECRET → Anmeldung gesperrt (fail closed)
 *  - "optional": ausdrücklich deaktiviert (ADMIN_MFA_OPTIONAL=true) oder lokale Entwicklung
 */
export function mfaStatus(): "enabled" | "required" | "optional" {
  if (process.env.ADMIN_TOTP_SECRET) return "enabled";
  if (process.env.NODE_ENV === "production" && process.env.ADMIN_MFA_OPTIONAL !== "true") return "required";
  return "optional";
}

/** Prüft den 2FA-Code und verbraucht ihn (jeder Code ist nur einmal gültig). */
export async function checkAndConsumeTotp(username: string, code: string): Promise<boolean> {
  const secret = process.env.ADMIN_TOTP_SECRET;
  if (!secret) return false;
  const step = verifyTotp(secret, code);
  if (step === null) return false;
  try {
    await db().adminTotpUse.create({ data: { username, step } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false; // bereits verwendet
    throw e;
  }
  await db()
    .adminTotpUse.deleteMany({ where: { usedAt: { lt: new Date(Date.now() - 86_400_000) } } })
    .catch(() => {});
  return true;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_TTL_S,
};

/** Neue serverseitige Sitzung anlegen und Cookie setzen. */
export async function startAdminSession(username: string) {
  const { token, sid, expiresAt } = createSessionToken(username);
  await db().adminSession.create({ data: { id: sessionIdHash(sid), username, expiresAt } });
  // Abgelaufene/abgemeldete Sitzungen aufräumen
  await db()
    .adminSession.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null, lt: new Date(Date.now() - 86_400_000) } }] } })
    .catch(() => {});
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
}

/** Aktuelle Sitzung serverseitig widerrufen und Cookie löschen. */
export async function endAdminSession() {
  const store = await cookies();
  const claims = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (claims && isDatabaseConfigured()) {
    await db()
      .adminSession.updateMany({ where: { id: sessionIdHash(claims.sid), revokedAt: null }, data: { revokedAt: new Date() } })
      .catch((e) => logError("auth", e, "Abmelden"));
  }
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

/**
 * Gültige Admin-Sitzung ermitteln: Signatur + Ablauf (Token) UND Datenbankeintrag
 * (nicht widerrufen, nicht abgelaufen, nicht im Leerlauf abgelaufen).
 */
export async function getAdminSession(): Promise<{ username: string } | null> {
  const store = await cookies();
  const claims = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!claims || claims.username !== adminUsername()) return null;
  if (!isDatabaseConfigured()) return null; // ohne Datenbank kein Widerruf möglich → fail closed
  try {
    const id = sessionIdHash(claims.sid);
    const s = await db().adminSession.findUnique({ where: { id } });
    const now = Date.now();
    if (!s || s.revokedAt || s.expiresAt.getTime() < now || s.username !== claims.username) return null;
    if (now - s.lastSeenAt.getTime() > SESSION_IDLE_S * 1000) {
      await db().adminSession.update({ where: { id }, data: { revokedAt: new Date() } }).catch(() => {});
      return null;
    }
    // Aktivität höchstens einmal pro Minute schreiben
    if (now - s.lastSeenAt.getTime() > 60_000) {
      await db().adminSession.update({ where: { id }, data: { lastSeenAt: new Date() } }).catch(() => {});
    }
    return { username: s.username };
  } catch (e) {
    logError("auth", e, "Sitzungsprüfung");
    return null;
  }
}

/** In jeder Admin-Seite und Server-Action aufrufen. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
