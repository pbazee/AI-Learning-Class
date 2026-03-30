import { notFound } from "next/navigation";
import { CourseDetailClient } from "@/components/courses/CourseDetailClient";
import { getCourseBySlug } from "@/lib/data";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  return <CourseDetailClient course={course} />;
}
