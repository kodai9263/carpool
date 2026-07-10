CREATE TABLE "LoginAttempt" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoginAttempt_email_ipAddress_key" ON "LoginAttempt"("email", "ipAddress");
CREATE INDEX "LoginAttempt_email_lockedUntil_idx" ON "LoginAttempt"("email", "lockedUntil");
CREATE INDEX "LoginAttempt_ipAddress_lockedUntil_idx" ON "LoginAttempt"("ipAddress", "lockedUntil");
