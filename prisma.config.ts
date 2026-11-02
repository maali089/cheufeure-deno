import "dotenv/config";
import { defineConfig } from "prisma/config";

// Die Datenbank-URL wird nur für Migrationen benötigt – `prisma generate` funktioniert auch ohne.
// DIRECT_URL (z. B. Supabase Session-Pooler, Port 5432) hat Vorrang, weil Migrationen
// über einen Transaktions-Pooler (Port 6543) fehlschlagen können.
const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  ...(migrationUrl ? { datasource: { url: migrationUrl } } : {}),
});
