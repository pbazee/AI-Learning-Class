import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function isAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const dbUser = await prisma.user.findUnique({ where: { email: user.email! }, select: { role: true } });
  return dbUser?.role === "ADMIN" || dbUser?.role === "SUPER_ADMIN";
}

export async function GET() {
  const program = await prisma.affiliateProgram.findFirst();
  return NextResponse.json(program ?? { isActive: true, commissionRate: 20, minPayout: 10, cookieDays: 30 });
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const existing = await prisma.affiliateProgram.findFirst();

  const data = {
    isActive: Boolean(body.isActive),
    commissionRate: Number(body.commissionRate) || 20,
    minPayout: Number(body.minPayout) || 10,
    cookieDays: Number(body.cookieDays) || 30,
  };

  const program = existing
    ? await prisma.affiliateProgram.update({ where: { id: existing.id }, data })
    : await prisma.affiliateProgram.create({ data });

  return NextResponse.json({ success: true, program });
}
