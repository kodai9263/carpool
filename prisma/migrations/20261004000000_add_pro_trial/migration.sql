ALTER TABLE "Admin"
  ADD COLUMN IF NOT EXISTS "proTrialStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "proTrialEndsAt" TIMESTAMP(3);

-- 既存のFree管理者にもリリース時点から30日間のPro体験を付与する。
-- 有料Proにはアプリ内体験を重ねず、請求上の補償はStripe側で別に扱う。
UPDATE "Admin"
SET
  "proTrialStartedAt" = CURRENT_TIMESTAMP,
  "proTrialEndsAt" = CURRENT_TIMESTAMP + INTERVAL '30 days'
WHERE "billingPlan" <> 'pro'
  AND "proTrialStartedAt" IS NULL
  AND "proTrialEndsAt" IS NULL
  AND COALESCE("stripeSubscriptionStatus", '') NOT IN ('active', 'trialing');
