import "server-only";
import { rootCertificates } from "node:tls";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { SUPABASE_ROOT_CA } from "./supabase-ca";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

/**
 * Verbindungsdaten für node-postgres aufbereiten. Gehostete Datenbanken (z. B. Supabase)
 * hängen Parameter wie `pgbouncer`/`supa` an, die node-postgres nicht kennt; TLS wird
 * deshalb hier explizit gesetzt statt über `sslmode`. Das Zertifikat wird immer geprüft.
 */
function connectionOptions(raw: string) {
  const url = new URL(raw);
  const sslmode = url.searchParams.get("sslmode");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  for (const key of ["sslmode", "pgbouncer", "supa", "connection_limit", "uselibpqcompat"]) url.searchParams.delete(key);
  const supabase = /(^|\.)supabase\.(co|com)$/.test(url.hostname);
  const ssl =
    sslmode === "disable" || (local && !sslmode)
      ? false
      : supabase
        ? { ca: [...rootCertificates, SUPABASE_ROOT_CA], rejectUnauthorized: true }
        : { rejectUnauthorized: true };
  return { connectionString: url.toString(), ssl };
}

function createClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL ist nicht gesetzt.");
  const adapter = new PrismaPg({
    ...connectionOptions(raw),
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    connectionTimeoutMillis: 8000,
  });
  return new PrismaClient({ adapter });
}

/** Lazy erzeugter Prisma-Client (wiederverwendet in Dev, um Verbindungsfluten zu vermeiden). */
export function db(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}
