CREATE TABLE "TeamSettlementAccess" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "freeTrialSettlementId" INTEGER,
    "freeTrialConsumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeamSettlementAccess_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TeamSettlementAccess_trial_consumed_check"
      CHECK ("freeTrialConsumedAt" IS NULL OR "freeTrialSettlementId" IS NOT NULL)
);

CREATE UNIQUE INDEX "TeamSettlementAccess_teamId_key" ON "TeamSettlementAccess"("teamId");
CREATE UNIQUE INDEX "TeamSettlementAccess_freeTrialSettlementId_key" ON "TeamSettlementAccess"("freeTrialSettlementId");

ALTER TABLE "TeamSettlementAccess"
  ADD CONSTRAINT "TeamSettlementAccess_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamSettlementAccess"
  ADD CONSTRAINT "TeamSettlementAccess_freeTrialSettlementId_fkey"
  FOREIGN KEY ("freeTrialSettlementId") REFERENCES "RideSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 先行環境に精算が存在する場合は、各チームの最初の精算を無料対象として引き継ぐ。
INSERT INTO "TeamSettlementAccess" (
  "teamId",
  "freeTrialSettlementId",
  "freeTrialConsumedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  first_settlement."teamId",
  first_settlement."id",
  first_revision."createdAt",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (settlement."teamId")
    settlement."id",
    settlement."teamId"
  FROM "RideSettlement" AS settlement
  -- 確定済みが1件でもあれば利用済みとして引き継ぎ、全件下書きなら最初の下書きを予約中にする。
  ORDER BY
    settlement."teamId",
    (settlement."currentRevisionNumber" IS NULL),
    settlement."createdAt",
    settlement."id"
) AS first_settlement
LEFT JOIN LATERAL (
  SELECT revision."createdAt"
  FROM "SettlementRevision" AS revision
  WHERE revision."settlementId" = first_settlement."id"
  ORDER BY revision."revision"
  LIMIT 1
) AS first_revision ON TRUE;

-- 無料体験情報はサーバーAPIだけが扱い、Supabase Data APIには公開しない。
ALTER TABLE "TeamSettlementAccess" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "TeamSettlementAccess" FROM anon;
    REVOKE ALL ON SEQUENCE "TeamSettlementAccess_id_seq" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "TeamSettlementAccess" FROM authenticated;
    REVOKE ALL ON SEQUENCE "TeamSettlementAccess_id_seq" FROM authenticated;
  END IF;
END $$;
