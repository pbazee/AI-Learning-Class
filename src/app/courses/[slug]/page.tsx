import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { CourseDetailClient } from "@/components/courses/CourseDetailClient";
import { getExpiredTimedCourseAccess } from "@/lib/access-control";
import { getAskAiSettings } from "@/lib/ask-ai-settings";
import { getCoursePreviewState } from "@/lib/course-preview-state";
import { getCourseBySlug, getCurrentUserProfile, getUserCourseAccessMap } from "@/lib/data";
import { buildCourseJsonLd } from "@/lib/seo";
import { buildSiteMetadata, getSiteBranding } from "@/lib/site-server";
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
    url: course.imageUrl || course.thumbnailUrl,
    path: course.imagePath,
    fallback: "",
  });

  return buildSiteMetadata(`/courses/${course.slug}`, {
    title: `${course.title} | AI GENIUS LAB`,
    description: course.shortDescription || course.description,
    image: courseImage || undefined,
  });
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [course, viewer, previewState, askAiSettings] = await Promise.all([
    getCourseBySlug(slug),
    getCurrentUserProfile(),
    getCoursePreviewState(slug),
    getAskAiSettings(),
  ]);

  if (!course) {
    notFound();
  }

  const viewerCourseAccess =
    viewer
      ? (await getUserCourseAccessMap(viewer.id, [course.id]))[course.id]
      : undefined;
  const courseAccess = viewerCourseAccess ?? previewState?.courseAccess;
  const expiredAccess =
    viewer && !courseAccess?.hasAccess ? await getExpiredTimedCourseAccess(viewer.id, course.id) : null;
  const branding = await getSiteBranding();
  const courseJsonLd = buildCourseJsonLd(course, branding.siteName);

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
