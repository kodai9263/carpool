-- CreateTable
CREATE TABLE "ChildAvailability" (
    "id" SERIAL NOT NULL,
    "availability" BOOLEAN NOT NULL DEFAULT false,
    "childId" INTEGER NOT NULL,
    "rideId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChildAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChildAvailability_rideId_childId_key" ON "ChildAvailability"("rideId", "childId");

-- AddForeignKey
ALTER TABLE "ChildAvailability" ADD CONSTRAINT "ChildAvailability_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildAvailability" ADD CONSTRAINT "ChildAvailability_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;
