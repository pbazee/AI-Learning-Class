import { ImageResponse } from "next/og";
import { getSiteBranding } from "@/lib/site-server";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

function getBrandMonogram(siteName: string) {
  return siteName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "AI";
}

export default async function Icon() {
  const branding = await getSiteBranding();
  const assetUrl = branding.faviconUrl || branding.logoUrl;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            borderRadius: "104px",
            overflow: "hidden",
            background: assetUrl
              ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.98) 100%)"
              : "linear-gradient(135deg, #2563eb 0%, #0f172a 100%)",
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
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
                objectFit: "contain",
                padding: "11%",
                transform: "scale(1.32)",
                filter: "drop-shadow(0 18px 32px rgba(15,23,42,0.18))",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                color: "#ffffff",
                fontSize: 270,
                fontWeight: 900,
                letterSpacing: "-0.08em",
                fontFamily: "Inter, Arial, sans-serif",
              }}
            >
              {getBrandMonogram(branding.siteName)}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
