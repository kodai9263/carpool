/*
  Warnings:

  - You are about to drop the column `rideId` on the `AvailabilityDriver` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."AvailabilityDriver" DROP CONSTRAINT "AvailabilityDriver_rideId_fkey";

-- DropIndex
DROP INDEX "public"."Driver_availabilityDriverId_key";

-- AlterTable
ALTER TABLE "AvailabilityDriver" DROP COLUMN "rideId";
