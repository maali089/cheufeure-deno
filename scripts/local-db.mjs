// Startet eine lokale, PostgreSQL-kompatible Entwicklungsdatenbank (PGlite) auf Port 5433.
// Nur für Entwicklung und Tests – für Produktion eine echte PostgreSQL-Instanz verwenden.
//   npm run db:local
//   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable"
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { mkdirSync } from "node:fs";

const dir = process.env.LOCAL_DB_DIR ?? ".local-db";
const port = Number(process.env.LOCAL_DB_PORT ?? 5433);
mkdirSync(dir, { recursive: true });

const db = await PGlite.create(dir);
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
await server.start();
console.log(`[local-db] PGlite läuft auf 127.0.0.1:${port} (Daten: ${dir})`);

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
