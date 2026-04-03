import { notFound } from "next/navigation";
import { CourseDetailClient } from "@/components/courses/CourseDetailClient";
import { getCoursePreviewState } from "@/lib/course-preview-state";
import { getCourseBySlug, getCurrentUserProfile, getUserCourseAccessMap } from "@/lib/data";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [course, viewer, previewState] = await Promise.all([
    getCourseBySlug(slug),
    getCurrentUserProfile(),
    getCoursePreviewState(slug),
  ]);

  if (!course) {
    notFound();
  }

  const fallbackCourseAccess =
    viewer && !previewState?.courseAccess
      ? (await getUserCourseAccessMap(viewer.id, [course.id]))[course.id]
      : undefined;
  const courseAccess = previewState?.courseAccess ?? fallbackCourseAccess;

  return (
    <CourseDetailClient
      course={course}
      viewer={viewer ? { id: viewer.id, name: viewer.name || viewer.email || "Member" } : null}
      courseAccess={courseAccess}
      previewState={previewState}
    />
  );
}
