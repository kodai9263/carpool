-- AlterTable: pendingTransferOldEmail を削除し、pendingTransferNewEmail と pendingTransferNewSupabaseUid を追加
ALTER TABLE "Admin" DROP COLUMN "pendingTransferOldEmail";
ALTER TABLE "Admin" ADD COLUMN "pendingTransferNewEmail" TEXT;
ALTER TABLE "Admin" ADD COLUMN "pendingTransferNewSupabaseUid" TEXT;
