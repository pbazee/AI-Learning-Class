import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  PUBLIC_CACHE_TAGS,
  PUBLIC_PAGE_REVALIDATE_SECONDS,
} from "@/lib/cache-config";
import { withRequestTiming } from "@/lib/server-performance";

const getCachedAnnouncements = unstable_cache(
  async (statusKey: "all" | "active" | "inactive") => {
    const now = new Date();
    const shouldBeActive =
      statusKey === "active"
        ? true
        : statusKey === "inactive"
          ? false
          : undefined;

    return prisma.announcement.findMany({
      where: {
        ...(shouldBeActive === undefined ? {} : { isActive: shouldBeActive }),
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { createdAt: "asc" },
    });
  },
  ["announcements-by-status"],
  {
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.announcements],
  }
);

export async function GET(request: NextRequest) {
  return withRequestTiming("api.announcements", async () => {
    try {
      const activeParam = request.nextUrl.searchParams.get("active");
      const statusParam = request.nextUrl.searchParams.get("status");
      const statusKey =
        activeParam === "true" || statusParam === "active"
          ? "active"
          : activeParam === "false" || statusParam === "inactive"
            ? "inactive"
            : "all";

      const announcements = await getCachedAnnouncements(statusKey);
      const response = NextResponse.json(announcements);

      response.headers.set(
        "Cache-Control",
        `public, s-maxage=${PUBLIC_PAGE_REVALIDATE_SECONDS}, stale-while-revalidate=${PUBLIC_PAGE_REVALIDATE_SECONDS}`
      );

      return response;
    } catch {
      return NextResponse.json([], { status: 200 });
    }
  });
}
