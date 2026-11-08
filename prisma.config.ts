import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma ist hier nur ORM (Client + Schema). Die Datenbank-Migrationen liegen in
// supabase/migrations/ und werden mit der Supabase CLI angewendet – NICHT mit `prisma migrate`.
// Die Datenbank-URL wird nur für `npm run db:diff` / `db:check` benötigt; `prisma generate` funktioniert ohne.
// DIRECT_URL (z. B. Supabase Session-Pooler, Port 5432) hat Vorrang vor dem Transaktions-Pooler (Port 6543).
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(url ? { datasource: { url } } : {}),
});
