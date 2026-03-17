-- AvailabilityDriver に direction カラム追加
ALTER TABLE "AvailabilityDriver" ADD COLUMN "direction" TEXT NOT NULL DEFAULT 'both';

-- Driver に direction カラム追加
ALTER TABLE "Driver" ADD COLUMN "direction" TEXT NOT NULL DEFAULT 'outbound';

-- Driver の unique インデックスを変更（direction を含む）
DROP INDEX "Driver_rideId_availabilityDriverId_key";
CREATE UNIQUE INDEX "Driver_rideId_availabilityDriverId_direction_key" ON "Driver"("rideId", "availabilityDriverId", "direction");
