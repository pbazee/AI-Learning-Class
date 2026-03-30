import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: dbUser.id },
      include: {
        conversions: { orderBy: { createdAt: "desc" }, take: 50 },
        payouts: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!affiliate) {
      return NextResponse.json({ affiliate: null });
    }

    const program = await prisma.affiliateProgram.findFirst();

    return NextResponse.json({ affiliate, program });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
