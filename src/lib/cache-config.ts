import "server-only";
import { env } from "@/lib/config";

export const PUBLIC_PAGE_REVALIDATE_SECONDS = Math.max(
  60,
  Number.parseInt(env.PUBLIC_PAGE_REVALIDATE_SECONDS ?? "300", 10)
);

export const POPUP_DATA_REVALIDATE_SECONDS = Math.max(
  30,
  Number.parseInt(env.POPUP_DATA_REVALIDATE_SECONDS ?? "60", 10)
);

export const CERTIFICATE_PDF_CACHE_REVALIDATE_SECONDS = Math.max(
  300,
  Number.parseInt(env.CERTIFICATE_PDF_CACHE_REVALIDATE_SECONDS ?? "86400", 10)
);

export const PUBLIC_CACHE_TAGS = {
  aboutPage: "public-about-page",
  affiliateProgram: "public-affiliate-program",
  announcements: "public-announcements",
  certificatePdf: "public-certificate-pdf",
  courseCatalog: "public-course-catalog",
  courses: "public-courses",
  heroSlides: "public-hero-slides",
  homepage: "public-homepage",
  homepageParagraphs: "public-homepage-paragraphs",
  popups: "public-popups",
  pricing: "public-pricing",
  testimonials: "public-testimonials",
  trustedLogos: "public-trusted-logos",
  blogPosts: "public-blog-posts",
  categories: "public-categories",
  siteSettings: "public-site-settings",
} as const;
