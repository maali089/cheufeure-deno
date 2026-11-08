-- Sicherheits-Härtung (Security Audit 2026-11):
--  1. Serverseitige Admin-Sitzungen (echtes Abmelden, Leerlauf-Timeout)
--  2. Schutz vor Wiederverwendung von 2FA-Codes
--  3. Zentrales Rate-Limit über alle Server-Instanzen
--  4. Row Level Security für alle neuen Tabellen
--  5. Supabase: Rechte der öffentlichen API-Rollen (anon/authenticated) entziehen
-- Bestehende Daten werden nicht verändert.

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminTotpUse" (
    "username" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminTotpUse_pkey" PRIMARY KEY ("username","step")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStartMs" BIGINT NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_windowStartMs_idx" ON "RateLimitBucket"("windowStartMs");

-- Row Level Security: ohne Policies kein Zugriff über öffentliche Datenbank-APIs.
ALTER TABLE "AdminSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminTotpUse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY;

-- Supabase vergibt standardmäßig ALLE Rechte (inkl. TRUNCATE, das nicht unter RLS fällt)
-- auf neue Tabellen im Schema "public" an die API-Rollen anon und authenticated.
-- Die Website nutzt die Supabase-REST/GraphQL-API nicht – diese Rollen brauchen keinerlei Zugriff.
-- Der Block läuft nur, wenn die Rollen existieren (also nicht in lokalen Test-Datenbanken).
DO $$
DECLARE
  r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      -- Auch für künftig von dieser Rolle (Migrationen) angelegte Objekte
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
    END IF;
  END LOOP;
END
$$;
