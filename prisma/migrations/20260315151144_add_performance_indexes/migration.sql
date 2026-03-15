-- CreateIndex
CREATE INDEX "AvailabilityDriver_rideId_type_idx" ON "AvailabilityDriver"("rideId", "type");

-- CreateIndex
CREATE INDEX "Child_memberId_idx" ON "Child"("memberId");

-- CreateIndex
CREATE INDEX "Guardian_memberId_idx" ON "Guardian"("memberId");

-- CreateIndex
CREATE INDEX "Ride_teamId_date_idx" ON "Ride"("teamId", "date");
