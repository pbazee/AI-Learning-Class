import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const DEFAULT_REFERRAL_PROGRAM = {
  isActive: true,
  minReferrals: 5,
  discountValue: 20,
  discountType: "percent",
  discountExpiry: 30,
  doubleSidedRewards: true,
  friendDiscountType: "percent",
  friendDiscountValue: 10,
  fraudDetectionEnabled: true,
};

function genCode() {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: {
        referrals: {
          include: { referred: { select: { name: true, email: true, createdAt: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Auto-generate referral code if missing
    if (!dbUser.referralCode) {
      let code = genCode();
      let attempts = 0;
      while (attempts < 10) {
        const clash = await prisma.user.findUnique({ where: { referralCode: code } });
        if (!clash) break;
        code = genCode();
        attempts++;
      }
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { referralCode: code },
        include: {
          referrals: {
            include: { referred: { select: { name: true, email: true, createdAt: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }

    const program = await prisma.referralProgram.findFirst();
    const completedCount = dbUser.referrals.filter((r) => r.status === "completed").length;
    const pendingReviewCount = dbUser.referrals.filter((r) => r.status === "pending_review").length;

    return NextResponse.json({
      referralCode: dbUser.referralCode,
      earnedDiscountCode: dbUser.earnedDiscountCode,
      referrals: dbUser.referrals,
      completedCount,
      pendingReviewCount,
      progressRemaining: Math.max((program?.minReferrals ?? DEFAULT_REFERRAL_PROGRAM.minReferrals) - completedCount, 0),
      program: program ?? DEFAULT_REFERRAL_PROGRAM,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
