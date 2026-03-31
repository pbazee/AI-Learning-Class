import { notFound } from "next/navigation";
import { CourseDetailClient } from "@/components/courses/CourseDetailClient";
import { getCourseBySlug, getCurrentUserProfile, getUserCourseAccessMap } from "@/lib/data";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [course, viewer] = await Promise.all([getCourseBySlug(slug), getCurrentUserProfile()]);

  if (!course) {
    notFound();
  }

  const courseAccess = viewer ? (await getUserCourseAccessMap(viewer.id, [course.id]))[course.id] : undefined;

  return (
    <CourseDetailClient
      course={course}
      viewer={viewer ? { id: viewer.id, name: viewer.name || viewer.email || "Member" } : null}
      courseAccess={courseAccess}
    />
  );
}
