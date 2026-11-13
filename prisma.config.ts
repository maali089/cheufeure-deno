import "dotenv/config";
import { defineConfig } from "prisma/config";
import { databaseUrl } from "./src/lib/server/db-url";

// Prisma ist hier nur ORM (Client + Schema). Die Datenbank-Migrationen liegen in
// supabase/migrations/ und werden mit der Supabase CLI angewendet – NICHT mit `prisma migrate`.
// Die Datenbank-URL wird nur für `npm run db:diff` / `db:check` benötigt; `prisma generate` funktioniert ohne.
// Die URL wird aus SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD abgeleitet (Session-Pooler).
const url = databaseUrl();
export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(url ? { datasource: { url } } : {}),
});
