import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { AnnouncementBarWrapper } from "@/components/landing/AnnouncementBarWrapper";
import { AppChrome } from "@/components/layout/AppChrome";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { RouteScrollReset } from "@/components/layout/RouteScrollReset";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import { env } from "@/lib/config";
import { buildSiteMetadata } from "@/lib/site-server";
import { Navbar } from "@/components/layout/Navbar";
import { getMetadataBase } from "@/lib/site-server";
import { PopupCampaigns } from "@/components/popups/PopupCampaigns";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const metadataBase = getMetadataBase();

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await buildSiteMetadata("/");

  return {
    ...metadata,
    title: {
      default: String(metadata.title || "AI GENIUS LAB"),
      template: `%s | ${metadata.applicationName || "AI GENIUS LAB"}`,
    },
    keywords: ["AI courses", "machine learning", "deep learning", "LLM", "ChatGPT", "Python AI"],
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bodyClassName = [inter?.variable, "professional-app", "antialiased"]
    .filter(Boolean)
    .join(" ");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof Promise.withResolvers === "undefined") {
                Promise.withResolvers = function() {
                  var resolve, reject;
                  var promise = new Promise(function(res, rej) {
                    resolve = res;
                    reject = rej;
                  });
                  return { promise: promise, resolve: resolve, reject: reject };
                };
              }
            `,
          }}
        />
      </head>
      <body className={bodyClassName}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <MotionConfig reducedMotion="user">
            <ToastProvider>
              <Suspense fallback={null}>
                <RouteScrollReset />
              </Suspense>
              <AppChrome
                announcementBar={
                  <Suspense fallback={null}>
                    <AnnouncementBarWrapper />
                  </Suspense>
                }
                popupCampaigns={
                  <Suspense fallback={null}>
                    <PopupCampaigns />
                  </Suspense>
                }
                navbar={<Navbar />}
              />
              <main id="main-content">{children}</main>
              <MobileBottomNav />
              <CookieConsentBanner />
              <AnalyticsScripts measurementId={env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
            </ToastProvider>
          </MotionConfig>
        </ThemeProvider>
      </body>
    </html>
  );
}
