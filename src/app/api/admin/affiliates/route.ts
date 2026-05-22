import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const query = req.nextUrl.searchParams.get("q")?.trim();

  const affiliates = await prisma.affiliate.findMany({
    where: {
      ...(status && status !== "all" ? { status } : {}),
      ...(query
        ? {
            OR: [
              { affiliateCode: { contains: query, mode: "insensitive" } },
              { user: { name: { contains: query, mode: "insensitive" } } },
              { user: { email: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { name: true, email: true, avatarUrl: true, country: true } },
      _count: { select: { conversions: true, payouts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(affiliates);
}
