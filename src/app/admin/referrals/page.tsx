import { prisma } from "@/lib/prisma";
import { ReferralsManager } from "@/components/admin/referrals-manager";

export default async function AdminReferralsPage() {
  const [program, referrals] = await Promise.all([
    prisma.referralProgram.findFirst(),
    prisma.referral.findMany({
      include: {
        referrer: { select: { name: true, email: true } },
        referred: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  return (
    <ReferralsManager
      initialProgram={
        program ?? {
          isActive: true,
          minReferrals: 5,
          discountType: "percent",
          discountValue: 20,
          discountExpiry: 30,
          doubleSidedRewards: true,
          friendDiscountType: "percent",
          friendDiscountValue: 10,
          fraudDetectionEnabled: true,
        }
      }
      initialReferrals={referrals.map((referral) => ({
        id: referral.id,
        status: referral.status,
        fraudStatus: referral.fraudStatus,
        fraudReason: referral.fraudReason,
        rewardIssued: referral.rewardIssued,
        friendRewardCode: referral.friendRewardCode,
        referrerRewardCode: referral.referrerRewardCode,
        createdAt: referral.createdAt.toISOString(),
        referrerName: referral.referrer.name || referral.referrer.email || "Unknown",
        referrerEmail: referral.referrer.email || "",
        referredName: referral.referred.name || referral.referred.email || "Unknown",
        referredEmail: referral.referred.email || "",
      }))}
    />
  );
}
