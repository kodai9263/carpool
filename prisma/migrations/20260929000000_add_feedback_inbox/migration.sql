ALTER TABLE "Feedback"
ADD COLUMN "notificationStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "notificationErrorCode" TEXT,
ADD COLUMN "notificationResponseCode" INTEGER,
ADD COLUMN "notificationAcceptedAt" TIMESTAMP(3),
ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- 既存投稿の配送結果は記録されていないため、成功・失敗を推測しない。
UPDATE "Feedback" SET "notificationStatus" = 'unknown';

CREATE INDEX "Feedback_reviewedAt_id_idx" ON "Feedback"("reviewedAt", "id");
