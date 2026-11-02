-- Zugriff über öffentliche Datenbank-APIs (z. B. Supabase REST mit anon-Key) sperren.
-- Ohne Policies dürfen nur Tabelleneigentümer (die Website-Verbindung) lesen und schreiben.
ALTER TABLE "BookingRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingStatusChange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StripeEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
