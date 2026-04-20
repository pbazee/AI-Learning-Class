import { ImageResponse } from "next/og";
import { getSiteBranding } from "@/lib/site-server";

// Force Node runtime so we can use Buffer and reliable fetch if needed.
export const runtime = "nodejs";

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
  let branding;
  try {
    branding = await getSiteBranding();
  } catch (err) {
    console.error("[icon] Failed to fetch site branding", err);
    branding = { siteName: "AI", faviconUrl: null, logoUrl: null };
  }

  const siteName = branding.siteName || "AI Learning";
  const assetUrl = branding.faviconUrl || branding.logoUrl;
  let dataUrl: string | null = null;

  // Try to fetch the image and convert to data URL to avoid satori "unknown image type" errors
  if (assetUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const res = await fetch(assetUrl, { 
        signal: controller.signal,
        headers: {
          "Accept": "image/*"
        }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const type = res.headers.get("content-type");
        if (type?.startsWith("image/")) {
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          dataUrl = `data:${type};base64,${base64}`;
        }
      }
    } catch (e) {
      console.error("[icon] Failed to pre-fetch branding image", e);
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: dataUrl
            ? "transparent"
            : "linear-gradient(135deg, #2563eb 0%, #0f172a 100%)",
          borderRadius: "96px",
          overflow: "hidden",
        }}
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={siteName}
            style={{
              width: "100%",
              height: "100%",
              // contain prevents clipping if the image isn't square
              objectFit: "contain",
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
              fontSize: 260,
              fontWeight: 900,
              letterSpacing: "-0.06em",
              fontFamily: "Inter, Arial, sans-serif",
            }}
          >
            {getBrandMonogram(siteName)}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
