CREATE TABLE "TeamSettlementSubscription" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "billingAdminId" INTEGER NOT NULL,
    "billingOwnerSupabaseUid" TEXT NOT NULL,
    "billingOwnerEmail" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeSubscriptionStatus" TEXT,
    "stripePriceId" TEXT,
    "stripeProductId" TEXT,
    "subscriptionStartedAt" TIMESTAMP(3),
    "lastStripeEventCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeamSettlementSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SettlementCheckoutReservation" (
    "id" SERIAL NOT NULL,
    "operationKey" TEXT NOT NULL,
    "activeKey" TEXT,
    "teamId" INTEGER NOT NULL,
    "billingAdminId" INTEGER NOT NULL,
    "billingOwnerSupabaseUid" TEXT NOT NULL,
    "returnPath" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SettlementCheckoutReservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SettlementCheckoutReservation_status_check"
      CHECK ("status" IN ('creating', 'open', 'complete', 'expired', 'failed')),
    CONSTRAINT "SettlementCheckoutReservation_active_check"
      CHECK ("activeKey" IS NULL OR "status" IN ('creating', 'open'))
);

CREATE TABLE "SettlementSubscriptionEvent" (
    "id" SERIAL NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventCreatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" INTEGER NOT NULL,
    "billingAdminId" INTEGER NOT NULL,
    "billingOwnerSupabaseUid" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripeStatus" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "stripeProductId" TEXT NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementSubscriptionEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SettlementBillingConversion" (
    "id" SERIAL NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "billingAdminId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementBillingConversion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SettlementBillingConversion_value_check" CHECK ("value" >= 0)
);

CREATE UNIQUE INDEX "TeamSettlementSubscription_teamId_key" ON "TeamSettlementSubscription"("teamId");
CREATE UNIQUE INDEX "TeamSettlementSubscription_stripeCustomerId_key" ON "TeamSettlementSubscription"("stripeCustomerId");
CREATE UNIQUE INDEX "TeamSettlementSubscription_stripeSubscriptionId_key" ON "TeamSettlementSubscription"("stripeSubscriptionId");
CREATE INDEX "TeamSettlementSubscription_billingAdminId_idx" ON "TeamSettlementSubscription"("billingAdminId");
CREATE UNIQUE INDEX "SettlementCheckoutReservation_operationKey_key" ON "SettlementCheckoutReservation"("operationKey");
CREATE UNIQUE INDEX "SettlementCheckoutReservation_activeKey_key" ON "SettlementCheckoutReservation"("activeKey");
CREATE UNIQUE INDEX "SettlementCheckoutReservation_stripeCheckoutSessionId_key" ON "SettlementCheckoutReservation"("stripeCheckoutSessionId");
CREATE INDEX "SettlementCheckoutReservation_teamId_createdAt_idx" ON "SettlementCheckoutReservation"("teamId", "createdAt");
CREATE UNIQUE INDEX "SettlementSubscriptionEvent_stripeEventId_key" ON "SettlementSubscriptionEvent"("stripeEventId");
CREATE INDEX "SettlementSubscriptionEvent_teamId_eventCreatedAt_idx" ON "SettlementSubscriptionEvent"("teamId", "eventCreatedAt");
CREATE INDEX "SettlementSubscriptionEvent_stripeSubscriptionId_idx" ON "SettlementSubscriptionEvent"("stripeSubscriptionId");
CREATE UNIQUE INDEX "SettlementBillingConversion_checkoutId_key" ON "SettlementBillingConversion"("checkoutId");
CREATE UNIQUE INDEX "SettlementBillingConversion_stripeSubscriptionId_key" ON "SettlementBillingConversion"("stripeSubscriptionId");
CREATE INDEX "SettlementBillingConversion_teamId_createdAt_idx" ON "SettlementBillingConversion"("teamId", "createdAt");

ALTER TABLE "TeamSettlementSubscription"
  ADD CONSTRAINT "TeamSettlementSubscription_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementCheckoutReservation"
  ADD CONSTRAINT "SettlementCheckoutReservation_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementSubscriptionEvent"
  ADD CONSTRAINT "SettlementSubscriptionEvent_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SettlementBillingConversion"
  ADD CONSTRAINT "SettlementBillingConversion_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 精算課金情報はサーバーAPIだけが扱い、Supabase Data APIには公開しない。
ALTER TABLE "TeamSettlementSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SettlementCheckoutReservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SettlementSubscriptionEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SettlementBillingConversion" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "TeamSettlementSubscription", "SettlementCheckoutReservation", "SettlementSubscriptionEvent", "SettlementBillingConversion" FROM anon;
    REVOKE ALL ON SEQUENCE "TeamSettlementSubscription_id_seq", "SettlementCheckoutReservation_id_seq", "SettlementSubscriptionEvent_id_seq", "SettlementBillingConversion_id_seq" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "TeamSettlementSubscription", "SettlementCheckoutReservation", "SettlementSubscriptionEvent", "SettlementBillingConversion" FROM authenticated;
    REVOKE ALL ON SEQUENCE "TeamSettlementSubscription_id_seq", "SettlementCheckoutReservation_id_seq", "SettlementSubscriptionEvent_id_seq", "SettlementBillingConversion_id_seq" FROM authenticated;
  END IF;
END $$;
