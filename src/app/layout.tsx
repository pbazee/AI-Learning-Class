import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AnnouncementBarWrapper } from "@/components/landing/AnnouncementBarWrapper";
import { AppChrome } from "@/components/layout/AppChrome";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { RouteScrollReset } from "@/components/layout/RouteScrollReset";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
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
              mobileBottomNav={<MobileBottomNav />}
            />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
