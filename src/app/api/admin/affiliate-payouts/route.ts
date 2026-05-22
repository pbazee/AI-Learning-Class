import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payouts = await prisma.affiliatePayout.findMany({
    include: { affiliate: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(payouts);
}
