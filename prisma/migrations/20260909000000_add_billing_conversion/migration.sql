CREATE TABLE "BillingConversion" (
    "id" SERIAL NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "adminId" INTEGER NOT NULL,
    "interval" TEXT,
    "source" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingConversion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingConversion_subscriptionId_key" ON "BillingConversion"("subscriptionId");
CREATE UNIQUE INDEX "BillingConversion_checkoutId_key" ON "BillingConversion"("checkoutId");

-- 契約の一次記録はサーバーのみが扱い、Supabase Data APIには公開しない。
ALTER TABLE "BillingConversion" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "BillingConversion" FROM anon;
    REVOKE ALL ON SEQUENCE "BillingConversion_id_seq" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "BillingConversion" FROM authenticated;
    REVOKE ALL ON SEQUENCE "BillingConversion_id_seq" FROM authenticated;
  END IF;
END $$;
