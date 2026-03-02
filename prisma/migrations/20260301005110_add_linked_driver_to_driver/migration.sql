-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "linkedDriverId" INTEGER;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_linkedDriverId_fkey" FOREIGN KEY ("linkedDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
