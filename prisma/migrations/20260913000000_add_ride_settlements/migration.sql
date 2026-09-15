CREATE TABLE "RideSettlement" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "rideId" INTEGER,
    "sourceDate" TIMESTAMP(3) NOT NULL,
    "sourceDestination" TEXT NOT NULL,
    "sourceFingerprint" TEXT,
    "sourceRideUpdatedAt" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 0,
    "currentRevisionNumber" INTEGER,
    "draft" JSONB,
    "voidReason" TEXT,
    "createdByAdminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RideSettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SettlementRevision" (
    "id" SERIAL NOT NULL,
    "settlementId" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "calculationVersion" TEXT NOT NULL DEFAULT '1',
    "correctionReason" TEXT,
    "createdByAdminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SettlementMovement" (
    "id" SERIAL NOT NULL,
    "settlementId" INTEGER NOT NULL,
    "memberIdSnapshot" INTEGER NOT NULL,
    "memberNameSnapshot" TEXT NOT NULL,
    "signedAmount" INTEGER NOT NULL,
    "operationKey" TEXT NOT NULL,
    "note" TEXT,
    "reversesMovementId" INTEGER,
    "createdByAdminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RideSettlement_rideId_key" ON "RideSettlement"("rideId");
CREATE INDEX "RideSettlement_teamId_status_createdAt_idx" ON "RideSettlement"("teamId", "status", "createdAt");
CREATE UNIQUE INDEX "SettlementRevision_settlementId_revision_key" ON "SettlementRevision"("settlementId", "revision");
CREATE INDEX "SettlementRevision_settlementId_createdAt_idx" ON "SettlementRevision"("settlementId", "createdAt");
CREATE UNIQUE INDEX "SettlementMovement_operationKey_key" ON "SettlementMovement"("operationKey");
CREATE UNIQUE INDEX "SettlementMovement_reversesMovementId_key" ON "SettlementMovement"("reversesMovementId");
CREATE INDEX "SettlementMovement_settlementId_memberIdSnapshot_createdAt_idx" ON "SettlementMovement"("settlementId", "memberIdSnapshot", "createdAt");

ALTER TABLE "RideSettlement" ADD CONSTRAINT "RideSettlement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RideSettlement" ADD CONSTRAINT "RideSettlement_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SettlementRevision" ADD CONSTRAINT "SettlementRevision_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "RideSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementMovement" ADD CONSTRAINT "SettlementMovement_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "RideSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementMovement" ADD CONSTRAINT "SettlementMovement_reversesMovementId_fkey" FOREIGN KEY ("reversesMovementId") REFERENCES "SettlementMovement"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- 精算情報はサーバーAPIだけが扱い、Supabase Data APIには公開しない。
ALTER TABLE "RideSettlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SettlementRevision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SettlementMovement" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "RideSettlement", "SettlementRevision", "SettlementMovement" FROM anon;
    REVOKE ALL ON SEQUENCE "RideSettlement_id_seq", "SettlementRevision_id_seq", "SettlementMovement_id_seq" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "RideSettlement", "SettlementRevision", "SettlementMovement" FROM authenticated;
    REVOKE ALL ON SEQUENCE "RideSettlement_id_seq", "SettlementRevision_id_seq", "SettlementMovement_id_seq" FROM authenticated;
  END IF;
END $$;
