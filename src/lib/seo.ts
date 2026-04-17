import "server-only";

import { resolveMediaUrl } from "@/lib/media";
import { absoluteUrl } from "@/lib/site-server";
import type { BlogPost, Course } from "@/types";

export function buildHomepageJsonLd(input: {
  siteName: string;
  logoUrl?: string;
  totalCourses: number;
  totalLearners: number;
}) {
  const organizationType =
    input.totalCourses > 0 ? "EducationalOrganization" : "Organization";

  return [
    {
      "@context": "https://schema.org",
      "@type": organizationType,
      name: input.siteName,
      url: absoluteUrl("/"),
      description:
        "Premium AI courses, hands-on projects, and practical career-focused learning paths.",
      logo: input.logoUrl,
      knowsAbout: [
        "Artificial Intelligence",
        "Machine Learning",
        "Generative AI",
        "LLM Engineering",
        "MLOps",
      ],
      numberOfEmployees: undefined,
      slogan: "Practical AI learning for modern builders.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: input.siteName,
      url: absoluteUrl("/"),
      potentialAction: {
        "@type": "SearchAction",
        target: absoluteUrl("/courses?search={search_term_string}"),
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Featured AI courses",
      url: absoluteUrl("/courses"),
      numberOfItems: input.totalCourses,
    },
  ];
}

export function buildCourseJsonLd(course: Course, siteName: string) {
  const image = resolveMediaUrl({
    url: course.imageUrl || course.thumbnailUrl,
    path: course.imagePath,
    fallback: "",
  });
  const reviews =
    course.reviews?.slice(0, 6).map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.name,
      },
      reviewBody: review.body,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
      },
      datePublished: review.createdAt,
    })) ?? [];

  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.shortDescription || course.description,
    url: absoluteUrl(`/courses/${course.slug}`),
    image: image || undefined,
    provider: {
      "@type": "Organization",
      name: siteName,
      url: absoluteUrl("/"),
    },
    offers: {
      "@type": "Offer",
      price: course.isFree ? 0 : course.price,
      priceCurrency: course.currency || "USD",
      availability: "https://schema.org/InStock",
      category: course.isFree ? "Free" : "Paid",
      url: absoluteUrl(`/courses/${course.slug}`),
    },
    aggregateRating:
      course.totalRatings > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: course.rating,
            reviewCount: course.totalRatings,
          }
        : undefined,
    review: reviews.length ? reviews : undefined,
    educationalLevel: course.level,
    inLanguage: course.language || "English",
    numberOfCredits: course.totalLessons,
    keywords: course.tags.join(", "),
  };
}

export function buildBlogPostJsonLd(
  post: BlogPost & { content?: string; publishedAtIso?: string },
  input: { siteName: string; logoUrl?: string }
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || post.content?.slice(0, 160) || post.title,
    image: post.coverImage ? [post.coverImage] : undefined,
    author: {
      "@type": "Person",
      name: post.authorName || input.siteName,
    },
    publisher: {
      "@type": "Organization",
      name: input.siteName,
      logo: input.logoUrl
        ? {
            "@type": "ImageObject",
            url: input.logoUrl,
          }
        : undefined,
    },
    datePublished: post.publishedAtIso,
    dateModified: post.publishedAtIso,
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    keywords: post.tags.join(", "),
  };
}
