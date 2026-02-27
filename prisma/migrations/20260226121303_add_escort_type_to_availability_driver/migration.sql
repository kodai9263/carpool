/*
  Warnings:

  - A unique constraint covering the columns `[rideId,guardianId,type]` on the table `AvailabilityDriver` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."AvailabilityDriver_rideId_guardianId_key";

-- AlterTable
ALTER TABLE "AvailabilityDriver" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'driver';

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'driver';

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityDriver_rideId_guardianId_type_key" ON "AvailabilityDriver"("rideId", "guardianId", "type");
