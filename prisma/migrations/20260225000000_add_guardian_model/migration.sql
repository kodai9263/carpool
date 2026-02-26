-- 1. Guardian テーブルを新規作成
CREATE TABLE "Guardian" (
    "id"        SERIAL       NOT NULL,
    "name"      TEXT         NOT NULL,
    "memberId"  INTEGER      NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- 2. 既存の Member.name を Guardian テーブルへ移行（1家庭 → 1保護者 として移行）
INSERT INTO "Guardian" ("name", "memberId", "createdAt", "updatedAt")
SELECT "name", "id", NOW(), NOW() FROM "Member";

-- 3. Guardian → Member の外部キー制約を追加
ALTER TABLE "Guardian"
    ADD CONSTRAINT "Guardian_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. AvailabilityDriver に guardianId カラムを追加（まず NULL 許可）
ALTER TABLE "AvailabilityDriver" ADD COLUMN "guardianId" INTEGER;

-- 5. memberId から対応する Guardian.id を逆引きして guardianId に設定
UPDATE "AvailabilityDriver" ad
SET "guardianId" = g."id"
FROM "Guardian" g
WHERE g."memberId" = ad."memberId";

-- 6. guardianId を NOT NULL に変更
ALTER TABLE "AvailabilityDriver" ALTER COLUMN "guardianId" SET NOT NULL;

-- 7. AvailabilityDriver → Guardian の外部キー制約を追加
ALTER TABLE "AvailabilityDriver"
    ADD CONSTRAINT "AvailabilityDriver_guardianId_fkey"
    FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. AvailabilityDriver の旧 unique 制約を削除し、新 unique 制約を追加
DROP INDEX IF EXISTS "AvailabilityDriver_rideId_memberId_key";
CREATE UNIQUE INDEX "AvailabilityDriver_rideId_guardianId_key"
    ON "AvailabilityDriver"("rideId", "guardianId");

-- 9. AvailabilityDriver から memberId カラムを削除
ALTER TABLE "AvailabilityDriver" DROP COLUMN "memberId";

-- 10. Member から name カラムを削除
ALTER TABLE "Member" DROP COLUMN "name";
