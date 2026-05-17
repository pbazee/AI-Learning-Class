import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  isAdminNotificationSection,
  type AdminNotificationSection,
} from "@/lib/admin-notification-sections";

async function getAdminUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true, role: true, email: true },
  });

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "SUPER_ADMIN")) {
    return null;
  }

  return dbUser;
}

function parseSince(value: string | null) {
  if (!value) {
    return new Date(0);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

async function getSectionCount(section: AdminNotificationSection, since: Date) {
  switch (section) {
    case "messages":
      return prisma.contactMessage.count({
        where: {
          OR: [
            { createdAt: { gt: since } },
            {
              replies: {
                some: {
                  isAdmin: false,
                  createdAt: { gt: since },
                },
              },
            },
          ],
        },
      });
    case "subscribers":
      return prisma.newsletterSubscriber.count({
        where: {
          subscribedAt: { gt: since },
        },
      });
    case "affiliates":
      return prisma.affiliate.count({
        where: {
          createdAt: { gt: since },
        },
      });
    case "orders":
      return prisma.order.count({
        where: {
          createdAt: { gt: since },
        },
      });
    case "reviews":
      return prisma.review.count({
        where: {
          createdAt: { gt: since },
        },
      });
    case "announcements":
      return prisma.announcement.count({
        where: {
          createdAt: { gt: since },
        },
      });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { section } = await params;

    if (!isAdminNotificationSection(section)) {
      return NextResponse.json({ error: "Unknown notification section." }, { status: 400 });
    }

    const since = parseSince(request.nextUrl.searchParams.get("since"));
    const count = await getSectionCount(section, since);

    return NextResponse.json({
      section,
      count,
      since: since.toISOString(),
    });
  } catch (error) {
    console.error("[admin-notifications] Unable to fetch unread counts.", error);
    return NextResponse.json(
      { error: "Unable to load notification counts right now." },
      { status: 500 }
    );
  }
}
