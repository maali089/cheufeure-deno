/**
 * Datenbank-Verbindung der App – ausschließlich aus zwei Variablen abgeleitet:
 *   SUPABASE_PROJECT_REF   (Supabase → Project Settings → General → Reference ID)
 *   SUPABASE_DB_PASSWORD   (Supabase → Project Settings → Database)
 * Verwendet wird der Supabase Session-Pooler (Port 5432, IPv4-tauglich, volle Postgres-Funktionen
 * inkl. Transaktionen). Der Transaktions-Pooler (Port 6543) wird bewusst nicht genutzt.
 * Optional: SUPABASE_DB_HOST überschreibt den Pooler-Host (Standard: Region eu-west-1 / Dublin).
 */
export const DEFAULT_POOLER_HOST = "aws-0-eu-west-1.pooler.supabase.com";

export function databaseUrl(env: Record<string, string | undefined> = process.env): string | null {
  const ref = env.SUPABASE_PROJECT_REF?.trim();
  const password = env.SUPABASE_DB_PASSWORD;
  if (!ref || !password) return null;
  const host = env.SUPABASE_DB_HOST?.trim() || DEFAULT_POOLER_HOST;
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:5432/postgres`;
}
