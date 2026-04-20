import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AnnouncementBarWrapper } from "@/components/landing/AnnouncementBarWrapper";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { RouteScrollReset } from "@/components/layout/RouteScrollReset";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { buildSiteMetadata } from "@/lib/site-server";
import { Navbar } from "@/components/layout/Navbar";
import { getMetadataBase } from "@/lib/site-server";

const PopupCampaigns = dynamic(
  () =>
    import("@/components/popups/PopupCampaigns").then((module) => ({
      default: module.PopupCampaigns,
    }))
);

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadataBase = getMetadataBase();

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
      <body className={`${inter.variable} professional-app antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <Suspense fallback={null}>
              <AnnouncementBarWrapper />
            </Suspense>
            <Suspense fallback={null}>
              <RouteScrollReset />
            </Suspense>
            <Suspense fallback={null}>
              <PopupCampaigns />
            </Suspense>
            <Navbar />
            {children}
            <MobileBottomNav />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
