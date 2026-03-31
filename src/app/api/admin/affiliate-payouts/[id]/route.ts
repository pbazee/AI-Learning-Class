import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAuditLog } from "@/lib/audit-log";

async function getAdminUser(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { id: true, role: true },
  });

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "SUPER_ADMIN")) {
    return null;
  }

  return dbUser;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const adminUser = await getAdminUser(supabase);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const status = body.status as string;

    if (!["pending", "approved", "processing", "paid", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const payout = await prisma.$transaction(async (tx) => {
      const existing = await tx.affiliatePayout.findUnique({
        where: { id },
        include: { affiliate: true },
      });

      if (!existing) {
        throw new Error("Payout not found");
      }

      if (
        status === "paid" &&
        existing.eligibleAt &&
        existing.eligibleAt.getTime() > Date.now()
      ) {
        throw new Error("This payout is still in the grace window and cannot be marked paid yet.");
      }

      const nextPayout = await tx.affiliatePayout.update({
        where: { id },
        data: {
          status,
          notes: body.notes ?? undefined,
          processedAt:
            status === "approved" || status === "processing" || status === "paid" || status === "rejected"
              ? new Date()
              : null,
        },
        include: { affiliate: true },
      });

      if (status === "paid" && existing.status !== "paid") {
        await tx.affiliate.update({
          where: { id: existing.affiliateId },
          data: {
            pendingPayout: { decrement: existing.amount },
            paidOut: { increment: existing.amount },
          },
        });

        await tx.affiliateConversion.updateMany({
          where: {
            affiliateId: existing.affiliateId,
            creditedAt: { not: null },
            status: { in: ["pending", "approved"] },
            fraudStatus: { not: "flagged" },
            eligibleAt: { lte: existing.createdAt },
          },
          data: { status: "paid" },
        });
      }

      return nextPayout;
    });

    await createAuditLog({
      actorId: adminUser.id,
      action: "affiliate_payout.updated",
      entityType: "AffiliatePayout",
      entityId: payout.id,
      summary: `Affiliate payout moved to ${status}.`,
      metadata: {
        status,
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json({ success: true, payout });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update the affiliate payout." },
      { status: 400 }
    );
  }
}
