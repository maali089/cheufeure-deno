-- Preisabsprache per WhatsApp/Telefon und Bestätigung durch den Betreiber.
-- Rein additiv: neuer Statuswert und neue, leere (NULL-fähige) Spalten.
-- Bestehende Buchungen werden nicht verändert.

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "agreedPrice" DECIMAL(10,2),
ADD COLUMN     "confirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "priceAgreedAt" TIMESTAMP(3);

-- Plausibler Preis (positiv, höchstens 100.000 €) – zusätzlich zur Prüfung im Server
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_agreedPrice_check" CHECK ("agreedPrice" IS NULL OR ("agreedPrice" > 0 AND "agreedPrice" <= 100000));
