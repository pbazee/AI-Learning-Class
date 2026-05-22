import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import type { PopupShowOn } from "@/types";
import { prisma } from "@/lib/prisma";
import { PUBLIC_CACHE_TAGS } from "@/lib/cache-config";
import { withRequestTiming } from "@/lib/server-performance";

export const revalidate = 60;

function resolveEligiblePlacements(pathname: string): PopupShowOn[] {
  if (pathname === "/") {
    return ["HOMEPAGE_ONLY", "ALL_PAGES"];
  }

  if (pathname.startsWith("/courses")) {
    return ["COURSE_PAGES", "ALL_PAGES"];
  }

  if (pathname.startsWith("/blog")) {
    return ["BLOG_PAGES", "ALL_PAGES"];
  }

  return ["ALL_PAGES"];
}

const getCachedActivePopup = unstable_cache(
  async (pathname: string) => {
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup")
    ) {
      return null;
    }

    const now = new Date();

    return prisma.popup.findFirst({
      where: {
        isActive: true,
        showOn: {
          in: resolveEligiblePlacements(pathname),
        },
        AND: [
          {
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          },
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        content: true,
        imageUrl: true,
        buttonText: true,
        link: true,
        delaySeconds: true,
      },
    });
  },
  ["active-popup-by-path"],
  {
    revalidate: 60,
    tags: [PUBLIC_CACHE_TAGS.popups],
  }
);

export async function GET(request: NextRequest) {
  return withRequestTiming("api.popups.active", async () => {
    try {
      const pathname = request.nextUrl.searchParams.get("path")?.trim() || "/";
      const popup = await getCachedActivePopup(pathname);
      const response = NextResponse.json({ popup });

      response.headers.set(
        "Cache-Control",
        "s-maxage=60, stale-while-revalidate=300"
      );

      return response;
    } catch (error) {
      console.error("[popups.active] Unable to resolve popup campaign.", error);
      return NextResponse.json({ popup: null });
    }
  });
}
