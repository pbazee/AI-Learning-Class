// src/app/layout.tsx
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { AnnouncementBarWrapper } from "@/components/landing/AnnouncementBarWrapper";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { RouteScrollReset } from "@/components/layout/RouteScrollReset";

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

export const metadata: Metadata = {
  title: {
    default: "AI Learning Class — Master AI & Machine Learning",
    template: "%s | AI Learning Class",
  },
  description:
    "The world's most advanced AI education platform. Learn Machine Learning, Deep Learning, LLM Engineering, and more with AI-powered personalized coaching.",
  keywords: ["AI courses", "machine learning", "deep learning", "LLM", "ChatGPT", "Python AI"],
  authors: [{ name: "AI Learning Class" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "AI Learning Class",
    title: "AI Learning Class — Master AI & Machine Learning",
    description: "The world's most advanced AI education platform.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
            {children}
            <MobileBottomNav />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
