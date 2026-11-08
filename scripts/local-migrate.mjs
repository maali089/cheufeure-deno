// Wendet supabase/migrations/ mit der Supabase CLI auf die LOKALE Testdatenbank an
// (`npm run db:local` muss laufen). Gegen entfernte Datenbanken wird nichts ausgeführt –
// dafür `npm run db:push` (verknüpftes Supabase-Projekt) verwenden.
//   npm run db:local:migrate
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
const raw = process.env.E2E_DATABASE_URL || process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable";
const url = new URL(raw);
if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
  console.error(`[local-migrate] Abgebrochen: ${url.hostname} ist keine lokale Datenbank.`);
  process.exit(1);
}
url.searchParams.set("sslmode", "disable");
// CLI direkt über Node starten (ohne Shell → keine Sonderzeichen-Probleme unter Windows)
const cli = createRequire(import.meta.url).resolve("supabase/dist/supabase.js");
execFileSync(process.execPath, [cli, "db", "push", `--remote=${url.toString()}`, "--yes"], { stdio: "inherit" });
