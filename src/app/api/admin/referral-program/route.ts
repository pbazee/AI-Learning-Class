import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

const DEFAULT_REFERRAL_PROGRAM = {
  isActive: true,
  minReferrals: 5,
  discountType: "percent",
  discountValue: 20,
  discountExpiry: 30,
  doubleSidedRewards: true,
  friendDiscountType: "percent",
  friendDiscountValue: 10,
  fraudDetectionEnabled: true,
};

async function getAdminUser(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { id: true, role: true, email: true },
  });

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "SUPER_ADMIN")) {
    return null;
  }

  return dbUser;
}

export async function GET() {
  const program = await prisma.referralProgram.findFirst();
  return NextResponse.json(program ?? DEFAULT_REFERRAL_PROGRAM);
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const adminUser = await getAdminUser(supabase);
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const existing = await prisma.referralProgram.findFirst();

  const data = {
    isActive: Boolean(body.isActive),
    minReferrals: Number(body.minReferrals) || 5,
    discountType: body.discountType || "percent",
    discountValue: Number(body.discountValue) || 20,
    discountExpiry: Number(body.discountExpiry) || 30,
    doubleSidedRewards:
      typeof body.doubleSidedRewards === "boolean" ? body.doubleSidedRewards : true,
    friendDiscountType: body.friendDiscountType || "percent",
    friendDiscountValue: Number(body.friendDiscountValue) || 10,
    fraudDetectionEnabled:
      typeof body.fraudDetectionEnabled === "boolean" ? body.fraudDetectionEnabled : true,
  };

  const program = existing
    ? await prisma.referralProgram.update({ where: { id: existing.id }, data })
    : await prisma.referralProgram.create({ data });

  await createAuditLog({
    actorId: adminUser.id,
    action: "referral_program.updated",
    entityType: "ReferralProgram",
    entityId: program.id,
    summary: "Referral program settings were updated.",
    metadata: data,
  });

  return NextResponse.json({ success: true, program });
}
