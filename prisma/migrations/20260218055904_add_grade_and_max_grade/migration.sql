-- AlterTable
ALTER TABLE "Child" ADD COLUMN     "grade" INTEGER,
ADD COLUMN     "gradeYear" INTEGER;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "maxGrade" INTEGER NOT NULL DEFAULT 6;
