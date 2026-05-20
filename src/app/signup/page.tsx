import { Suspense } from "react";
import { SignupPageClient } from "@/components/auth/SignupPageClient";
import { getSiteBranding } from "@/lib/site-server";

export default async function SignupPage() {
  const branding = await getSiteBranding();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_30%),linear-gradient(180deg,#2563eb_0%,#2563eb_50%,#ffffff_50%,#ffffff_100%)]" />
      }
    >
      <SignupPageClient
        initialBranding={{
          siteName: branding.siteName,
          logoUrl: branding.logoUrl,
        }}
      />
    </Suspense>
  );
}
