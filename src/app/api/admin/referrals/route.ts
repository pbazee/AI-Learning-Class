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
  if (!(await isAdmin(supabase))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status");
  const fraudStatus = req.nextUrl.searchParams.get("fraudStatus");
  const query = req.nextUrl.searchParams.get("q")?.trim();
  const page = Number(req.nextUrl.searchParams.get("page") || "1");
  const pageSize = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || "25")));
  const skip = Math.max(0, (page - 1) * pageSize);

  const where = {
    ...(status && status !== "all" ? { status } : {}),
    ...(fraudStatus && fraudStatus !== "all" ? { fraudStatus } : {}),
    ...(query
      ? {
          OR: [
            { referrer: { name: { contains: query, mode: "insensitive" as const } } },
            { referrer: { email: { contains: query, mode: "insensitive" as const } } },
            { referred: { name: { contains: query, mode: "insensitive" as const } } },
            { referred: { email: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, referrals, completed, rewardsIssued, flagged] = await Promise.all([
    prisma.referral.count({ where }),
    prisma.referral.findMany({
      where,
      include: {
        referrer: { select: { name: true, email: true } },
        referred: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.referral.count({ where: { ...where, status: "completed" } }),
    prisma.referral.count({ where: { ...where, rewardIssued: true } }),
    prisma.referral.count({ where: { ...where, fraudStatus: "flagged" } }),
  ]);

  return NextResponse.json({
    data: referrals,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    stats: {
      total,
      completed,
      rewardsIssued,
      flagged,
    },
  });
}
