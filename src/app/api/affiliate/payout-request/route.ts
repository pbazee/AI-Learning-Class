import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAuditLog } from "@/lib/audit-log";
import { DEFAULT_AFFILIATE_PROGRAM, getAvailableAffiliateBalance, hasOpenAffiliatePayout } from "@/lib/affiliate-program";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const affiliate = await prisma.affiliate.findUnique({ where: { userId: dbUser.id } });
    if (!affiliate || affiliate.status !== "active") {
      return NextResponse.json({ error: "Affiliate account not active" }, { status: 403 });
    }

    const program = (await prisma.affiliateProgram.findFirst()) ?? DEFAULT_AFFILIATE_PROGRAM;
    const minPayout = program?.minPayout ?? 10;
    const availablePayout = await getAvailableAffiliateBalance(affiliate.id);
    const openPayout = await hasOpenAffiliatePayout(affiliate.id);

    if (openPayout) {
      return NextResponse.json(
        { error: "You already have an open payout request being reviewed." },
        { status: 400 }
      );
    }

    if (availablePayout < minPayout) {
      return NextResponse.json(
        {
          error: `Minimum payout is $${minPayout}. Your currently eligible balance is $${availablePayout.toFixed(2)}.`,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const method = body.method as string;
    const destinationDetails = body.destinationDetails ?? null;
    const validMethods = ["mpesa", "bank", "paypal"];
    if (!method || !validMethods.includes(method)) {
      return NextResponse.json({ error: "Invalid payout method" }, { status: 400 });
    }

    const payout = await prisma.affiliatePayout.create({
      data: {
        affiliateId: affiliate.id,
        amount: availablePayout,
        method,
        status: "pending",
        destinationDetails,
        eligibleAt: new Date(),
      },
    });

    await createAuditLog({
      actorId: dbUser.id,
      action: "affiliate_payout.requested",
      entityType: "AffiliatePayout",
      entityId: payout.id,
      summary: "Affiliate requested a payout.",
      metadata: {
        method,
        amount: availablePayout,
      },
    });

    return NextResponse.json({ success: true, payout });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
