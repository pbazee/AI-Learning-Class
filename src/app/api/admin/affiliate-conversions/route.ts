import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const adminUser = await getAdminUser(supabase);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const fraudStatus = req.nextUrl.searchParams.get("fraudStatus");

  const conversions = await prisma.affiliateConversion.findMany({
    where: {
      ...(status && status !== "all" ? { status } : {}),
      ...(fraudStatus && fraudStatus !== "all" ? { fraudStatus } : {}),
    },
    include: { affiliate: { include: { user: { select: { name: true, email: true, country: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(conversions);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const adminUser = await getAdminUser(supabase);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, status } = body as { id: string; status: string };

    if (!["pending", "approved", "paid", "rejected", "flagged"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const conversion = await prisma.$transaction(async (tx) => {
      const existing = await tx.affiliateConversion.findUnique({
        where: { id },
        include: { affiliate: true },
      });

      if (!existing) {
        throw new Error("Conversion not found");
      }

      let creditedAt = existing.creditedAt;
      let fraudStatus = existing.fraudStatus;
      let fraudReason = body.fraudReason ?? existing.fraudReason ?? null;

      if (status === "flagged") {
        fraudStatus = "flagged";
        fraudReason = fraudReason ?? "Flagged by admin review.";
      } else if (status === "approved" && fraudStatus === "flagged") {
        fraudStatus = "reviewed";
        fraudReason = body.fraudReason ?? "Approved after fraud review.";
      }

      if ((status === "rejected" || status === "flagged") && existing.creditedAt) {
        await tx.affiliate.update({
          where: { id: existing.affiliateId },
          data: {
            totalConversions: { decrement: 1 },
            totalEarnings: { decrement: existing.commission },
            pendingPayout: { decrement: existing.commission },
          },
        });
        creditedAt = null;
      }

      if (status === "approved" && !existing.creditedAt) {
        await tx.affiliate.update({
          where: { id: existing.affiliateId },
          data: {
            totalConversions: { increment: 1 },
            totalEarnings: { increment: existing.commission },
            pendingPayout: { increment: existing.commission },
          },
        });
        creditedAt = new Date();
      }

      return tx.affiliateConversion.update({
        where: { id },
        data: {
          status,
          fraudStatus,
          fraudReason,
          creditedAt,
        },
      });
    });

    await createAuditLog({
      actorId: adminUser.id,
      action: "affiliate_conversion.updated",
      entityType: "AffiliateConversion",
      entityId: conversion.id,
      summary: `Affiliate conversion moved to ${status}.`,
      metadata: {
        status,
        fraudStatus: conversion.fraudStatus,
        fraudReason: conversion.fraudReason,
      },
    });

    return NextResponse.json({ success: true, conversion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update the affiliate conversion." },
      { status: 400 }
    );
  }
}
