ALTER TABLE "ReferralProgram"
  ADD COLUMN IF NOT EXISTS "doubleSidedRewards" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "friendDiscountType" TEXT NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS "friendDiscountValue" DOUBLE PRECISION NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "fraudDetectionEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Referral"
  ADD COLUMN IF NOT EXISTS "fraudStatus" TEXT NOT NULL DEFAULT 'clear',
  ADD COLUMN IF NOT EXISTS "fraudReason" TEXT,
  ADD COLUMN IF NOT EXISTS "referrerRewardCode" TEXT,
  ADD COLUMN IF NOT EXISTS "friendRewardCode" TEXT;

ALTER TABLE "AffiliateProgram"
  ADD COLUMN IF NOT EXISTS "payoutGraceDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "fraudDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "allowRecurringCommissions" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AffiliateConversion"
  ADD COLUMN IF NOT EXISTS "fraudStatus" TEXT NOT NULL DEFAULT 'clear',
  ADD COLUMN IF NOT EXISTS "fraudReason" TEXT,
  ADD COLUMN IF NOT EXISTS "eligibleAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "creditedAt" TIMESTAMP(3);

ALTER TABLE "AffiliatePayout"
  ADD COLUMN IF NOT EXISTS "destinationDetails" JSONB,
  ADD COLUMN IF NOT EXISTS "eligibleAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "summary" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
