-- 回答期限後にメンバーの回答をロックするかの設定を追加
ALTER TABLE "Ride" ADD COLUMN "lockAfterDeadline" BOOLEAN NOT NULL DEFAULT false;
