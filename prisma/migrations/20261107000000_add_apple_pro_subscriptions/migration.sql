ALTER TABLE "Admin"
  ADD COLUMN "appleProExpiresAt" TIMESTAMP(3),
  ADD COLUMN "appleProEnvironment" TEXT,
  ADD COLUMN "appleProAccountToken" TEXT;

CREATE TABLE "AppleSubscription" (
  "id" SERIAL NOT NULL,
  "adminId" INTEGER NOT NULL,
  "environment" TEXT NOT NULL,
  "originalTransactionId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "appAccountToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "gracePeriodExpiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "isUpgraded" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppleSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AppleSubscription_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AppleSubscription_environment_originalTransactionId_key" ON "AppleSubscription"("environment", "originalTransactionId");
CREATE INDEX "AppleSubscription_adminId_environment_idx" ON "AppleSubscription"("adminId", "environment");

-- 購入者自身も契約を書き換えられない。検証済みのサーバー経路のみ使用する。
ALTER TABLE "AppleSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Admin" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AppleSubscription", "Admin" FROM PUBLIC;
REVOKE ALL ON SEQUENCE "AppleSubscription_id_seq", "Admin_id_seq" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "AppleSubscription", "Admin" FROM anon;
    REVOKE ALL ON SEQUENCE "AppleSubscription_id_seq", "Admin_id_seq" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "AppleSubscription", "Admin" FROM authenticated;
    REVOKE ALL ON SEQUENCE "AppleSubscription_id_seq", "Admin_id_seq" FROM authenticated;
  END IF;
END $$;

-- テーブル権限のREVOKEでは既存の列単位GRANTは残るため、全列を明示的に除外する。
DO $$
DECLARE
  admin_columns TEXT;
  client_role TEXT;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum)
    INTO admin_columns
    FROM pg_attribute
    WHERE attrelid = 'public."Admin"'::regclass AND attnum > 0 AND NOT attisdropped;
  EXECUTE format(
    'REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s) ON TABLE public."Admin" FROM PUBLIC',
    admin_columns
  );
  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
      EXECUTE format(
        'REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s) ON TABLE public."Admin" FROM %2$I',
        admin_columns, client_role
      );
    END IF;
  END LOOP;
END $$;
