import "server-only";

import { prisma } from "@/lib/prisma";

export const DEFAULT_AFFILIATE_PROGRAM = {
  isActive: true,
  commissionRate: 20,
  minPayout: 10,
  cookieDays: 30,
  payoutGraceDays: 30,
  fraudDetectionEnabled: true,
  allowRecurringCommissions: false,
};

export const OPEN_PAYOUT_STATUSES = ["pending", "approved", "processing"] as const;

export async function getAvailableAffiliateBalance(affiliateId: string, asOf = new Date()) {
  const result = await prisma.affiliateConversion.aggregate({
    where: {
      affiliateId,
      creditedAt: { not: null },
      status: { in: ["pending", "approved"] },
      fraudStatus: { not: "flagged" },
      eligibleAt: { lte: asOf },
    },
    _sum: {
      commission: true,
    },
  });

  return result._sum.commission ?? 0;
}

export async function hasOpenAffiliatePayout(affiliateId: string) {
  const count = await prisma.affiliatePayout.count({
    where: {
      affiliateId,
      status: { in: [...OPEN_PAYOUT_STATUSES] },
    },
  });

  return count > 0;
}
