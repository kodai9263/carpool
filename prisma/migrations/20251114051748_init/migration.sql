/*
  Warnings:

  - Added the required column `teamId` to the `AvailabilityDriver` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AvailabilityDriver" ADD COLUMN     "teamId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "AvailabilityDriver" ADD CONSTRAINT "AvailabilityDriver_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
