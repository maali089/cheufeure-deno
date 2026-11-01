-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'CONFIRMED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('ONE_WAY', 'ROUND_TRIP', 'AIRPORT', 'HOURLY');

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'RECEIVED',
    "tripType" "TripType" NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupPlaceId" TEXT,
    "dropoffAddress" TEXT,
    "dropoffPlaceId" TEXT,
    "stops" TEXT[],
    "pickupDate" TEXT NOT NULL,
    "pickupTime" TEXT NOT NULL,
    "returnDate" TEXT,
    "returnTime" TEXT,
    "durationHours" INTEGER,
    "passengers" INTEGER NOT NULL,
    "luggage" INTEGER NOT NULL,
    "flightNumber" TEXT,
    "tripNotes" TEXT,
    "vehicleClass" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "company" TEXT,
    "specialRequests" TEXT,
    "privacyAckAt" TIMESTAMP(3) NOT NULL,
    "distanceMeters" INTEGER,
    "durationSeconds" INTEGER,
    "quotedPrice" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "pricingSource" TEXT,
    "operatorNotifiedAt" TIMESTAMP(3),
    "customerNotifiedAt" TIMESTAMP(3),
    "notificationError" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingStatusChange" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "note" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "emailError" TEXT,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetSetting" (
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetSetting_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_reference_key" ON "BookingRequest"("reference");

-- CreateIndex
CREATE INDEX "BookingRequest_status_createdAt_idx" ON "BookingRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingRequest_pickupDate_idx" ON "BookingRequest"("pickupDate");

-- CreateIndex
CREATE INDEX "BookingStatusChange_bookingId_changedAt_idx" ON "BookingStatusChange"("bookingId", "changedAt");

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "BookingStatusChange" ADD CONSTRAINT "BookingStatusChange_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

