import "server-only";

import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { resolveAppOrigin } from "@/lib/app-origin";
import { appendMediaVersion, resolveMediaUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SITE_DESCRIPTION, normalizeSiteName } from "@/lib/site";
import { PUBLIC_CACHE_TAGS } from "@/lib/cache-config";

export type SiteBranding = {
  siteName: string;
  logoUrl?: string;
  faviconUrl?: string;
  assetVersion?: string;
};

function normalizeSocialLinks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, String(entryValue ?? "")])
  );
}

export const getSiteBranding = unstable_cache(
  async (): Promise<SiteBranding> => {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: {
        siteName: true,
        logoUrl: true,
        faviconUrl: true,
        socialLinks: true,
        updatedAt: true,
      },
    });

    const socialLinks = normalizeSocialLinks(settings?.socialLinks);
    const assetVersion = settings?.updatedAt?.getTime();
    const logoUrl = appendMediaVersion(
      resolveMediaUrl({
        url: settings?.logoUrl,
        path: socialLinks.brandLogoPath,
        fallback: "",
      }),
      assetVersion
    );
    const faviconUrl = appendMediaVersion(
      resolveMediaUrl({
        url: settings?.faviconUrl,
        path: socialLinks.brandFaviconPath,
        fallback: "",
      }),
      assetVersion
    );

    return {
      siteName: normalizeSiteName(settings?.siteName),
      logoUrl: logoUrl || undefined,
      faviconUrl: faviconUrl || undefined,
      assetVersion: assetVersion ? String(assetVersion) : undefined,
    };
  },
  ["site-branding"],
  { tags: [PUBLIC_CACHE_TAGS.siteSettings] }
);

export const getFooterSettings = unstable_cache(
  async () => {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
    });

    const socialLinks = normalizeSocialLinks(settings?.socialLinks);
    const assetVersion = settings?.updatedAt?.getTime();
    const logoUrl = appendMediaVersion(
      resolveMediaUrl({
        url: settings?.logoUrl,
        path: socialLinks.brandLogoPath,
        fallback: "",
      }),
      assetVersion
    );

    return {
      siteName: normalizeSiteName(settings?.siteName),
      logoUrl: logoUrl || undefined,
      supportEmail: settings?.supportEmail || undefined,
      supportPhone: settings?.supportPhone || undefined,
      whatsappNumber: socialLinks.whatsapp || undefined,
      physicalAddress: settings?.supportAddress || undefined,
      facebookUrl: socialLinks.facebook || undefined,
      twitterUrl: socialLinks.x || socialLinks.twitter || undefined,
      instagramUrl: socialLinks.instagram || undefined,
      linkedInUrl: socialLinks.linkedin || undefined,
      youtubeUrl: socialLinks.youtube || undefined,
      tiktokUrl: socialLinks.tiktok || undefined,
    };
  },
  ["footer-settings"],
  { tags: [PUBLIC_CACHE_TAGS.siteSettings] }
);

export function getMetadataBase() {
  return new URL(resolveAppOrigin({ allowLocal: true }));
}

export function absoluteUrl(path = "/") {
  return new URL(path, getMetadataBase()).toString();
}

export function buildCanonicalMetadata(path: string): Pick<Metadata, "alternates"> {
  return {
    alternates: {
      canonical: absoluteUrl(path),
    },
  };
}

export async function buildSiteMetadata(
  path = "/",
  overrides?: {
    title?: string;
    description?: string;
    image?: string | null;
  }
): Promise<Metadata> {
  const branding = await getSiteBranding();
  const title = overrides?.title || `${branding.siteName} | Practical AI Education`;
  const description = overrides?.description || DEFAULT_SITE_DESCRIPTION;
  const image = overrides?.image || branding.logoUrl || undefined;
  const canonical = absoluteUrl(path);
  const iconUrl = `/icon${branding.assetVersion ? `?v=${branding.assetVersion}` : ""}`;

  return {
    metadataBase: getMetadataBase(),
    title,
    description,
    applicationName: branding.siteName,
    authors: [{ name: branding.siteName }],
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      siteName: branding.siteName,
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
    icons: {
      icon: [
        {
          url: iconUrl,
          sizes: "16x16",
          type: "image/png",
        },
        {
          url: iconUrl,
          sizes: "32x32",
          type: "image/png",
        },
        {
          url: iconUrl,
          sizes: "192x192",
          type: "image/png",
        },
        {
          url: iconUrl,
          sizes: "512x512",
          type: "image/png",
        },
      ],
      shortcut: iconUrl,
      apple: [
        {
          url: iconUrl,
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
  };
}
