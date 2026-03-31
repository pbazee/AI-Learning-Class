import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { DEFAULT_AFFILIATE_PROGRAM, getAvailableAffiliateBalance, hasOpenAffiliatePayout } from "@/lib/affiliate-program";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const program = (await prisma.affiliateProgram.findFirst()) ?? DEFAULT_AFFILIATE_PROGRAM;
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: dbUser.id },
      include: {
        conversions: { orderBy: { createdAt: "desc" }, take: 50 },
        payouts: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!affiliate) {
      return NextResponse.json({
        affiliate: null,
        program,
        availablePayout: 0,
        heldBalance: 0,
        hasOpenPayout: false,
      });
    }

    const availablePayout = await getAvailableAffiliateBalance(affiliate.id);
    const heldBalance = Math.max(affiliate.pendingPayout - availablePayout, 0);
    const hasOpenPayout = await hasOpenAffiliatePayout(affiliate.id);

    return NextResponse.json({ affiliate, program, availablePayout, heldBalance, hasOpenPayout });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
