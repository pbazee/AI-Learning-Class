import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const activeParam = request.nextUrl.searchParams.get("active");
    const statusParam = request.nextUrl.searchParams.get("status");

    const shouldBeActive =
      activeParam === "true" || statusParam === "active"
        ? true
        : activeParam === "false" || statusParam === "inactive"
          ? false
          : undefined;

    const announcements = await prisma.announcement.findMany({
      where: {
        ...(shouldBeActive === undefined ? {} : { isActive: shouldBeActive }),
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(announcements);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
