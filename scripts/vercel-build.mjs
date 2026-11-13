// Build für Vercel:
//  1. Prisma-Client erzeugen (Prisma ist nur noch ORM – die Migrationen verwaltet die Supabase CLI)
//  2. Datenbank-Migrationen aus supabase/migrations/ anwenden (`supabase db push`),
//     aber nur, wenn eine Datenbank konfiguriert ist
//  3. Next.js bauen
// So lässt sich die Website auch ohne Datenbank als Vorschau bereitstellen
// (Buchungsanfragen melden dann ehrlich „momentan nicht verfügbar“).
// Mit SKIP_DB_MIGRATIONS=1 werden die Migrationen übersprungen (z. B. wenn sie manuell laufen).
import { execFileSync, execSync } from "node:child_process";
import { createRequire } from "node:module";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

run("prisma generate");

// Verbindung wird – wie in der App (src/lib/server/db-url.ts) – aus SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD abgeleitet
// (Session-Pooler, Port 5432).
const ref = process.env.SUPABASE_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
const host = process.env.SUPABASE_DB_HOST?.trim() || "aws-0-eu-west-1.pooler.supabase.com";
if (process.env.SKIP_DB_MIGRATIONS === "1") {
  console.warn("[vercel-build] SKIP_DB_MIGRATIONS=1 – Migrationen übersprungen.");
} else if (!ref || !password) {
  console.warn("[vercel-build] SUPABASE_PROJECT_REF/SUPABASE_DB_PASSWORD fehlen – Migrationen übersprungen. Buchungen werden erst mit Datenbank gespeichert.");
} else {
  const url = new URL(`postgresql://postgres.${ref}@${host}:5432/postgres`);
  url.password = password;
  url.searchParams.set("sslmode", "require");
  try {
    // URL als Argument ohne Shell: kein Escaping-Problem, Passwort erscheint nicht im Log
    const cli = createRequire(import.meta.url).resolve("supabase/dist/supabase.js");
    execFileSync(process.execPath, [cli, "db", "push", `--remote=${url.toString()}`, "--yes"], { stdio: "inherit" });
  } catch {
    console.error(
      [
        "[vercel-build] `supabase db push` ist fehlgeschlagen – der Build wird abgebrochen, die bisherige Version bleibt online.",
        "Häufigste Ursache nach dem Umstieg von Prisma Migrate: Die Migrations-Historie der Supabase CLI ist noch leer,",
        "obwohl die Tabellen schon existieren. Einmalig ausführen (siehe docs/EINRICHTUNG.md → „Datenbank-Migrationen“):",
        "  npx supabase migration repair --status applied <Versionen> --remote",
      ].join("\n"),
    );
    process.exit(1);
  }
}

run("next build");
