import "server-only";

/**
 * Fehler protokollieren, ohne personenbezogene Daten preiszugeben.
 * Prisma-Fehlermeldungen enthalten u. a. die übergebenen Werte (Name, E-Mail, Adresse …),
 * daher werden nur Fehlertyp und -code geloggt – nicht die Meldung selbst.
 */
export function logError(tag: string, e: unknown, context?: string) {
  const err = e as { name?: string; code?: string; constructor?: { name?: string } } | null;
  const type = err?.constructor?.name ?? err?.name ?? typeof e;
  const code = typeof err?.code === "string" ? ` code=${err.code}` : "";
  console.error(`[${tag}]${context ? ` ${context}:` : ""} ${type}${code}`);
}
