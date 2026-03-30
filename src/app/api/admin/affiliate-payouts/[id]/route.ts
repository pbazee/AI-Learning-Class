import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

async function isAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const dbUser = await prisma.user.findUnique({ where: { email: user.email! }, select: { role: true } });
  return dbUser?.role === "ADMIN" || dbUser?.role === "SUPER_ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const status = body.status as string;

  if (!["pending", "processing", "paid"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const payout = await prisma.affiliatePayout.update({
    where: { id },
    data: { status, notes: body.notes ?? undefined },
    include: { affiliate: true },
  });

  // If marking as paid, move amount from pendingPayout to paidOut
  if (status === "paid") {
    await prisma.affiliate.update({
      where: { id: payout.affiliateId },
      data: {
        pendingPayout: { decrement: payout.amount },
        paidOut: { increment: payout.amount },
      },
    });
  }

  return NextResponse.json({ success: true, payout });
}
