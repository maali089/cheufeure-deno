-- Zugriff über öffentliche Datenbank-APIs (z. B. Supabase REST mit anon-Key) sperren.
-- Ohne Policies dürfen nur Tabelleneigentümer (die Website-Verbindung) lesen und schreiben.
ALTER TABLE "BookingRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingStatusChange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StripeEvent" ENABLE ROW LEVEL SECURITY;

-- Alte Prisma-Migrationstabelle (nur in Datenbanken, die früher per `prisma migrate deploy`
-- migriert wurden). In neuen Datenbanken (Supabase CLI) existiert sie nicht.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
