import { NextRequest, NextResponse } from "next/server";
import { CouponDiscountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAuditLog } from "@/lib/audit-log";
import { createRewardCode, evaluateReferralFraud } from "@/lib/growth-utils";

const DEFAULT_REFERRAL_PROGRAM = {
  minReferrals: 5,
  discountType: "percent",
  discountValue: 20,
  discountExpiry: 30,
  doubleSidedRewards: true,
  friendDiscountType: "percent",
  friendDiscountValue: 10,
  fraudDetectionEnabled: true,
};

async function createReferralCoupon({
  code,
  description,
  discountType,
  discountValue,
  discountExpiry,
}: {
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  discountExpiry: number;
}) {
  await prisma.coupon.create({
    data: {
      code,
      description,
      discountType:
        discountType === "fixed" ? CouponDiscountType.FIXED_AMOUNT : CouponDiscountType.PERCENTAGE,
      value: discountValue,
      expiresAt: new Date(Date.now() + discountExpiry * 86400000),
      usageLimit: 1,
      isActive: true,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const referralCode = body.referralCode as string | undefined;

    // Apply referral code if provided and user hasn't been referred yet
    if (referralCode && !dbUser.referredById) {
      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (!referrer || referrer.id === dbUser.id) {
        return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
      }

      const existingReferral = await prisma.referral.findUnique({ where: { referredId: dbUser.id } });
      if (existingReferral) {
        return NextResponse.json({ error: "Already referred" }, { status: 400 });
      }

      const program = await prisma.referralProgram.findFirst();
      const recentReferralCount = await prisma.referral.count({
        where: {
          referrerId: referrer.id,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });
      const fraudAssessment = evaluateReferralFraud({
        referrerEmail: referrer.email,
        referredEmail: dbUser.email,
        recentReferralCount,
        enabled: program?.fraudDetectionEnabled ?? DEFAULT_REFERRAL_PROGRAM.fraudDetectionEnabled,
      });
      const status = fraudAssessment.fraudStatus === "flagged" ? "pending_review" : "completed";

      const referral = await prisma.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: dbUser.id,
          status,
          fraudStatus: fraudAssessment.fraudStatus,
          fraudReason: fraudAssessment.fraudReason,
        },
      });

      await prisma.user.update({ where: { id: dbUser.id }, data: { referredById: referrer.id } });

      if (status !== "completed") {
        await createAuditLog({
          actorId: dbUser.id,
          action: "referral.flagged",
          entityType: "Referral",
          entityId: referral.id,
          summary: "Referral was held for manual fraud review.",
          metadata: {
            referralCode,
            reason: fraudAssessment.fraudReason,
          },
        });

        return NextResponse.json({
          success: true,
          pendingReview: true,
          message: "Referral captured and sent for manual review.",
        });
      }

      let friendRewardCode: string | null = null;
      let referrerRewardCode: string | null = null;

      if (program?.doubleSidedRewards ?? DEFAULT_REFERRAL_PROGRAM.doubleSidedRewards) {
        friendRewardCode = createRewardCode("FRIEND", dbUser.id);
        await createReferralCoupon({
          code: friendRewardCode,
          description: "Referral friend welcome reward",
          discountType: program?.friendDiscountType ?? DEFAULT_REFERRAL_PROGRAM.friendDiscountType,
          discountValue: program?.friendDiscountValue ?? DEFAULT_REFERRAL_PROGRAM.friendDiscountValue,
          discountExpiry: program?.discountExpiry ?? DEFAULT_REFERRAL_PROGRAM.discountExpiry,
        });

        if (!dbUser.earnedDiscountCode) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { earnedDiscountCode: friendRewardCode },
          });
        }
      }

      const minReferrals = program?.minReferrals ?? DEFAULT_REFERRAL_PROGRAM.minReferrals;
      const completedCount = await prisma.referral.count({
        where: { referrerId: referrer.id, status: "completed" },
      });

      if (completedCount >= minReferrals && !referrer.earnedDiscountCode) {
        referrerRewardCode = createRewardCode("REF", referrer.id);
        await prisma.user.update({
          where: { id: referrer.id },
          data: { earnedDiscountCode: referrerRewardCode },
        });
        await createReferralCoupon({
          code: referrerRewardCode,
          description: "Referral milestone reward",
          discountType: program?.discountType ?? DEFAULT_REFERRAL_PROGRAM.discountType,
          discountValue: program?.discountValue ?? DEFAULT_REFERRAL_PROGRAM.discountValue,
          discountExpiry: program?.discountExpiry ?? DEFAULT_REFERRAL_PROGRAM.discountExpiry,
        });
        await prisma.referral.updateMany({
          where: { referrerId: referrer.id, status: "completed" },
          data: { rewardIssued: true },
        });
      }

      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          rewardIssued: Boolean(referrerRewardCode),
          friendRewardCode,
          referrerRewardCode,
        },
      });

      await createAuditLog({
        actorId: dbUser.id,
        action: "referral.completed",
        entityType: "Referral",
        entityId: referral.id,
        summary: "Referral completed successfully.",
        metadata: {
          referralCode,
          friendRewardCode,
          referrerRewardCode,
          completedCount,
        },
      });

      return NextResponse.json({
        success: true,
        message:
          referrerRewardCode || friendRewardCode
            ? "Referral applied and rewards issued successfully."
            : "Referral applied successfully.",
      });
    }

    return NextResponse.json({ error: "No referral code provided or already referred" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
