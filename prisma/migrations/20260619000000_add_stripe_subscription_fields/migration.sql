ALTER TABLE "Admin" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Admin" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Admin" ADD COLUMN "stripeSubscriptionStatus" TEXT;

CREATE UNIQUE INDEX "Admin_stripeCustomerId_key" ON "Admin"("stripeCustomerId");
CREATE UNIQUE INDEX "Admin_stripeSubscriptionId_key" ON "Admin"("stripeSubscriptionId");
