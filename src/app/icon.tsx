import { ImageResponse } from "next/og";
import { getSiteBranding } from "@/lib/site-server";

// Always regenerate so admin-uploaded favicons take effect immediately.
export const revalidate = 0;

// Use the largest standard favicon size for crisp rendering at all scales.
export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

function getBrandMonogram(siteName: string) {
  return (
    siteName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "AI"
  );
}

export default async function Icon() {
  const branding = await getSiteBranding();
  const assetUrl = branding.faviconUrl || branding.logoUrl;

  return new ImageResponse(
    (
      // Root fills the full canvas – no padding or border-radius so the
      // image occupies every pixel just like Google / Grok favicons.
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: assetUrl
            ? "transparent"
            : "linear-gradient(135deg, #2563eb 0%, #0f172a 100%)",
          borderRadius: "96px",
          overflow: "hidden",
        }}
      >
        {assetUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl}
            alt={branding.siteName}
            style={{
              width: "100%",
              height: "100%",
              // cover fills every pixel; contain would add letterboxing
              objectFit: "contain",
            }}
          />
        ) : (
          // Monogram fallback – large text, no inner box
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              color: "#ffffff",
              fontSize: 260,
              fontWeight: 900,
              letterSpacing: "-0.06em",
              fontFamily: "Inter, Arial, sans-serif",
            }}
          >
            {getBrandMonogram(branding.siteName)}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
