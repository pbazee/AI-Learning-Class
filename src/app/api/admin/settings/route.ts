import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SITE_NAME } from "@/lib/site";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const socialKeyMap: Record<string, string> = {
  facebookUrl: "facebook",
  twitterUrl: "x",
  instagramUrl: "instagram",
  linkedInUrl: "linkedin",
  youtubeUrl: "youtube",
  tiktokUrl: "tiktok",
  whatsappNumber: "whatsapp",
};

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const settingsInput = body?.settings && typeof body.settings === "object" ? body.settings : body;

  const entries = Object.entries(settingsInput as Record<string, unknown>)
    .map(([key, value]) => [key, value == null ? "" : String(value).trim()] as const);

  const existing = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  const existingSocials =
    existing?.socialLinks && typeof existing.socialLinks === "object" && !Array.isArray(existing.socialLinks)
      ? Object.fromEntries(Object.entries(existing.socialLinks).map(([key, value]) => [key, String(value)]))
      : {};

  const socialLinks = { ...existingSocials };
  let supportEmail = existing?.supportEmail || "";
  let supportPhone = existing?.supportPhone || "";
  let supportAddress = existing?.supportAddress || "";

  for (const [key, value] of entries) {
    if (key === "supportEmail") supportEmail = value;
    if (key === "supportPhone") supportPhone = value;
    if (key === "physicalAddress") supportAddress = value;

    const socialKey = socialKeyMap[key];
    if (socialKey) {
      socialLinks[socialKey] = value;
    }
  }

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {
      supportEmail: supportEmail || null,
      supportPhone: supportPhone || null,
      supportAddress: supportAddress || null,
      socialLinks,
    },
    create: {
      id: "singleton",
      siteName: DEFAULT_SITE_NAME,
      supportEmail: supportEmail || null,
      supportPhone: supportPhone || null,
      supportAddress: supportAddress || null,
      socialLinks,
    },
  });

  return NextResponse.json({ success: true, message: "Settings saved successfully." });
}

