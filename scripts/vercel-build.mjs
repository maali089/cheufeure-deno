// Build für Vercel: Datenbank-Migrationen nur, wenn eine Datenbank konfiguriert ist.
// So lässt sich die Website auch ohne Datenbank als Vorschau bereitstellen
// (Buchungsanfragen melden dann ehrlich „momentan nicht verfügbar“).
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

run("prisma generate");
if (process.env.DIRECT_URL || process.env.DATABASE_URL) {
  run("prisma migrate deploy");
} else {
  console.warn("[vercel-build] DATABASE_URL fehlt – Migrationen übersprungen. Buchungen werden erst mit Datenbank gespeichert.");
}
run("next build");
