import "server-only";
import { timingSafeEqual } from "node:crypto";
import { verifyPassword } from "./password";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE, SESSION_TTL_S, verifySessionToken } from "./session-token";

export { SESSION_COOKIE, createSessionToken, isAdminConfigured } from "./session-token";

export function checkCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME || "deeno";
  const userOk = Buffer.from(username).length === Buffer.from(expectedUser).length && timingSafeEqual(Buffer.from(username), Buffer.from(expectedUser));
  const passOk = verifyPassword(password, process.env.ADMIN_PASSWORD_HASH); // immer ausführen (Timing)
  return userOk && passOk;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_TTL_S,
};

export async function getAdminSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** In jeder Admin-Seite und Server-Action aufrufen. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
