import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { CourseDetailClient } from "@/components/courses/CourseDetailClient";
import { getExpiredTimedCourseAccess } from "@/lib/access-control";
import { getAskAiSettings } from "@/lib/ask-ai-settings";
import { getCoursePreviewState } from "@/lib/course-preview-state";
import {
  getCourseBySlug,
  getCurrentUserProfile,
  getPublicCourseCatalogData,
  getUserCourseAccessMap,
} from "@/lib/data";
import { buildCourseJsonLd } from "@/lib/seo";
import { absoluteUrl, buildSiteMetadata, getSiteBranding } from "@/lib/site-server";
import { resolveMediaUrl } from "@/lib/media";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    return buildSiteMetadata(`/courses/${slug}`, {
      title: "Course Not Found",
      description: "This course could not be found.",
    });
  }

  const courseImage = resolveMediaUrl({
    url: course.thumbnailUrl || course.imageUrl,
    path: course.imagePath,
    fallback: "",
  });

  return buildSiteMetadata(`/courses/${course.slug}`, {
    title: course.title,
    description: course.shortDescription || course.description,
    image: courseImage || undefined,
    canonicalUrl: absoluteUrl(`/courses/${course.slug}`),
    openGraphTitle: course.title,
    openGraphDescription: course.shortDescription || course.description,
  });
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [course, viewer, previewState, askAiSettings, catalogData] = await Promise.all([
    getCourseBySlug(slug),
    getCurrentUserProfile(),
    getCoursePreviewState(slug).catch((error) => {
      console.error("[course-detail] Unable to load preview state. Continuing without it.", error);
      return null;
    }),
    getAskAiSettings().catch((error) => {
      console.error("[course-detail] Unable to load Ask AI settings. Falling back to defaults.", error);
      return {
        enabled: true,
        assistantLabel: "Ask AI",
        systemPrompt: "",
      };
    }),
    getPublicCourseCatalogData().catch((error) => {
      console.error("[course-detail] Unable to load related course catalog. Continuing without it.", error);
      return { categories: [], courses: [] };
    }),
  ]);

  if (!course) {
    notFound();
  }

  let viewerCourseAccess;

  if (viewer) {
    try {
      viewerCourseAccess = (await getUserCourseAccessMap(viewer.id, [course.id]))[course.id];
    } catch (error) {
      console.error("[course-detail] Unable to resolve viewer access state.", error);
    }
  }
  const courseAccess = viewerCourseAccess ?? previewState?.courseAccess;
  let expiredAccess = null;

  if (viewer && !courseAccess?.hasAccess) {
    try {
      expiredAccess = await getExpiredTimedCourseAccess(viewer.id, course.id);
    } catch (error) {
      console.error("[course-detail] Unable to resolve expired access state.", error);
    }
  }
  const branding = await getSiteBranding();
  const courseJsonLd = buildCourseJsonLd(course, branding.siteName);
  const relatedCourses = catalogData.courses
    .filter((candidate) => candidate.id !== course.id)
    .sort((left, right) => {
      const leftScore =
        (left.categoryId === course.categoryId ? 4 : 0) +
        (left.level === course.level ? 2 : 0) +
        (left.isFeatured ? 1 : 0) +
        (left.isTrending ? 1 : 0);
      const rightScore =
        (right.categoryId === course.categoryId ? 4 : 0) +
        (right.level === course.level ? 2 : 0) +
        (right.isFeatured ? 1 : 0) +
        (right.isTrending ? 1 : 0);

      return rightScore - leftScore || right.totalStudents - left.totalStudents;
    })
    .slice(0, 3);

  return (
    <div className="bg-background">
      <JsonLd data={courseJsonLd} />
      <CourseDetailClient
        course={course}
        viewer={viewer ? { id: viewer.id, name: viewer.name || viewer.email || "Member" } : null}
        courseAccess={courseAccess}
        previewState={previewState}
        askAiEnabled={askAiSettings.enabled}
        askAiAssistantLabel={askAiSettings.assistantLabel}
        shareUrl={absoluteUrl(`/courses/${course.slug}`)}
        relatedCourses={relatedCourses}
        expiredAccess={
          expiredAccess
            ? {
                expiredAt: expiredAccess.expiredAt?.toISOString() ?? null,
                planSlug: expiredAccess.planSlug,
                billingCycle: expiredAccess.billingCycle,
              }
            : null
        }
      />
      <Footer />
    </div>
  );
}
