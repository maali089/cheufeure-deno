import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL ist nicht gesetzt.");
  const adapter = new PrismaPg({
    connectionString,
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
