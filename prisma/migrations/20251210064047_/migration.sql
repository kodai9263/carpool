/*
  Warnings:

  - A unique constraint covering the columns `[rideId,memberId]` on the table `AvailabilityDriver` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityDriver_rideId_memberId_key" ON "AvailabilityDriver"("rideId", "memberId");
