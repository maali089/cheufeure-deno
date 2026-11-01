import "dotenv/config";
import { defineConfig } from "prisma/config";

// DATABASE_URL wird nur für Migrationen benötigt – `prisma generate` funktioniert auch ohne.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  ...(process.env.DATABASE_URL ? { datasource: { url: process.env.DATABASE_URL } } : {}),
});
