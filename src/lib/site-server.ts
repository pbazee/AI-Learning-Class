import "server-only";

import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { resolveAppOrigin } from "@/lib/app-origin";
import { appendMediaVersion, resolveMediaUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SITE_DESCRIPTION, normalizeSiteName } from "@/lib/site";
import { PUBLIC_CACHE_TAGS } from "@/lib/cache-config";
import { isPrismaConnectionError, isPrismaSchemaMismatchError, logPrismaConnectionEvent } from "@/lib/prisma-errors";

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
    try {
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
          url: settings?.logoUrl ?? undefined,
          path: socialLinks.brandLogoPath,
          fallback: "",
        }),
        assetVersion
      );
      const faviconUrl = appendMediaVersion(
        resolveMediaUrl({
          url: settings?.faviconUrl ?? undefined,
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
    } catch (err) {
      console.error("[getSiteBranding] Failed to fetch site branding", err);
      // Fallback to avoid crashing the whole site metadata/layout
      return {
        siteName: "AI Learning Platform",
      };
    }
  },
  ["site-branding"],
  { tags: [PUBLIC_CACHE_TAGS.siteSettings] }
);

export const getFooterSettings = unstable_cache(
  async () => {
    let settings = null;

    try {
      settings = await prisma.siteSettings.findUnique({
        where: { id: "singleton" },
      });
    } catch (error) {
      if (!isPrismaConnectionError(error) && !isPrismaSchemaMismatchError(error)) {
        throw error;
      }

      logPrismaConnectionEvent(
        "site-server:getFooterSettings",
        "[getFooterSettings] Failed to fetch footer settings. Returning defaults.",
        error,
        "warn"
      );
    }

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
    canonicalUrl?: string;
    openGraphTitle?: string;
    openGraphDescription?: string;
    robots?: Metadata["robots"];
  }
): Promise<Metadata> {
  const branding = await getSiteBranding();
  const title = overrides?.title || `${branding.siteName} | Practical AI Education`;
  const description = overrides?.description || DEFAULT_SITE_DESCRIPTION;
  const image = overrides?.image || branding.logoUrl || undefined;
  const canonical = overrides?.canonicalUrl || absoluteUrl(path);
  const iconUrl = `/favicon.svg${branding.assetVersion ? `?v=${branding.assetVersion}` : ""}`;
  const openGraphTitle = overrides?.openGraphTitle || title;
  const openGraphDescription = overrides?.openGraphDescription || description;

  return {
    metadataBase: getMetadataBase(),
    title,
    description,
    applicationName: branding.siteName,
    authors: [{ name: branding.siteName }],
    alternates: {
      canonical,
    },
    robots: overrides?.robots,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      siteName: branding.siteName,
      title: openGraphTitle,
      description: openGraphDescription,
      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 630,
              alt: openGraphTitle,
            },
          ]
        : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: openGraphTitle,
      description: openGraphDescription,
      images: image ? [image] : undefined,
    },
    icons: {
      icon: [
        {
          url: iconUrl,
          sizes: "any",
          type: "image/svg+xml",
        },
      ],
      shortcut: iconUrl,
      apple: [
        {
          url: iconUrl,
          sizes: "any",
          type: "image/svg+xml",
        },
      ],
    },
  };
}
