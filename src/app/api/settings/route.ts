import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendMediaVersion, resolveMediaUrl } from "@/lib/media";
import { normalizeSiteName } from "@/lib/site";

export const dynamic = "force-dynamic";

type SettingsKeyInput = {
  siteName?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  supportAddress?: string | null;
  assetVersion?: number | null;
  socialLinks?: Record<string, string>;
};

const KEY_MAPPERS: Record<string, (input: SettingsKeyInput) => string> = {
  supportEmail: (input) => input.supportEmail || "",
  supportPhone: (input) => input.supportPhone || "",
  whatsappNumber: (input) => input.socialLinks?.whatsapp || "",
  physicalAddress: (input) => input.supportAddress || "",
  facebookUrl: (input) => input.socialLinks?.facebook || "",
  twitterUrl: (input) => input.socialLinks?.x || input.socialLinks?.twitter || "",
  instagramUrl: (input) => input.socialLinks?.instagram || "",
  linkedInUrl: (input) => input.socialLinks?.linkedin || "",
  youtubeUrl: (input) => input.socialLinks?.youtube || "",
  tiktokUrl: (input) => input.socialLinks?.tiktok || "",
  siteName: (input) => normalizeSiteName(input.siteName || input.socialLinks?.siteName),
  logoUrl: (input) =>
    appendMediaVersion(
      resolveMediaUrl({
        url: input.socialLinks?.logoUrl,
        path: input.socialLinks?.brandLogoPath,
        fallback: "",
      }),
      input.assetVersion
    ) || "",
  faviconUrl: (input) =>
    appendMediaVersion(
      resolveMediaUrl({
        url: input.socialLinks?.faviconUrl,
        path: input.socialLinks?.brandFaviconPath,
        fallback: "",
      }),
      input.assetVersion
    ) || "",
};

export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    if (!settings) return NextResponse.json({});

    const socialLinks =
      settings.socialLinks && typeof settings.socialLinks === "object" && !Array.isArray(settings.socialLinks)
        ? Object.fromEntries(Object.entries(settings.socialLinks).map(([key, value]) => [key, String(value)]))
        : {};
    const assetVersion = settings.updatedAt?.getTime?.() ?? null;

    const fullPayload = {
      siteName: normalizeSiteName(settings.siteName),
      logoUrl: KEY_MAPPERS.logoUrl({
        assetVersion,
        socialLinks: {
          ...socialLinks,
          logoUrl: settings.logoUrl || "",
        },
      }),
      faviconUrl: KEY_MAPPERS.faviconUrl({
        assetVersion,
        socialLinks: {
          ...socialLinks,
          faviconUrl: settings.faviconUrl || "",
        },
      }),
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      supportAddress: settings.supportAddress,
      socialLinks,
      whatsappNumber: socialLinks.whatsapp || "",
      physicalAddress: settings.supportAddress || "",
      facebookUrl: socialLinks.facebook || "",
      twitterUrl: socialLinks.x || socialLinks.twitter || "",
      instagramUrl: socialLinks.instagram || "",
      linkedInUrl: socialLinks.linkedin || "",
      youtubeUrl: socialLinks.youtube || "",
      tiktokUrl: socialLinks.tiktok || "",
    };

    const keysParam = request.nextUrl.searchParams.get("keys");
    if (!keysParam) {
      return NextResponse.json(fullPayload);
    }

    const requestedKeys = keysParam
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);

    const keyValuePayload = requestedKeys.reduce<Record<string, string>>((acc, key) => {
      const resolver = KEY_MAPPERS[key];
      if (resolver) {
        acc[key] = resolver({
          assetVersion,
          siteName: settings.siteName,
          supportEmail: settings.supportEmail,
          supportPhone: settings.supportPhone,
          supportAddress: settings.supportAddress,
          socialLinks: {
            ...socialLinks,
            siteName: normalizeSiteName(settings.siteName),
            logoUrl: settings.logoUrl || "",
            faviconUrl: settings.faviconUrl || "",
          },
        });
      }
      return acc;
    }, {});

    return NextResponse.json(keyValuePayload);
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}
