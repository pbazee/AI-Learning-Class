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

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status");

  const affiliates = await prisma.affiliate.findMany({
    where: status ? { status } : undefined,
    include: {
      user: { select: { name: true, email: true, avatarUrl: true } },
      _count: { select: { conversions: true, payouts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(affiliates);
}
