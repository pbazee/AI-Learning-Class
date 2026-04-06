import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAuditLog } from "@/lib/audit-log";
import { DEFAULT_AFFILIATE_PROGRAM } from "@/lib/affiliate-program";
import { PUBLIC_CACHE_TAGS } from "@/lib/cache-config";

export const dynamic = "force-dynamic";

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
  const program = await prisma.affiliateProgram.findFirst();
  return NextResponse.json(program ?? DEFAULT_AFFILIATE_PROGRAM);
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const adminUser = await getAdminUser(supabase);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const existing = await prisma.affiliateProgram.findFirst();

  const data = {
    isActive: Boolean(body.isActive),
    commissionRate: Number(body.commissionRate) || 20,
    minPayout: Number(body.minPayout) || 10,
    cookieDays: Number(body.cookieDays) || 30,
    payoutGraceDays: Number(body.payoutGraceDays) || 30,
    fraudDetectionEnabled:
      typeof body.fraudDetectionEnabled === "boolean" ? body.fraudDetectionEnabled : true,
    allowRecurringCommissions:
      typeof body.allowRecurringCommissions === "boolean"
        ? body.allowRecurringCommissions
        : false,
  };

  const program = existing
    ? await prisma.affiliateProgram.update({ where: { id: existing.id }, data })
    : await prisma.affiliateProgram.create({ data });

  await createAuditLog({
    actorId: adminUser.id,
    action: "affiliate_program.updated",
    entityType: "AffiliateProgram",
    entityId: program.id,
    summary: "Affiliate program settings were updated.",
    metadata: data,
  });

  revalidatePath("/");
  revalidateTag(PUBLIC_CACHE_TAGS.affiliateProgram);
  revalidateTag(PUBLIC_CACHE_TAGS.homepage);

  return NextResponse.json({ success: true, program });
}
