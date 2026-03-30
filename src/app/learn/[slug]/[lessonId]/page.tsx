import { notFound } from "next/navigation";
import { LessonPlayerClient } from "@/components/learn/LessonPlayerClient";
import { getCourseBySlug } from "@/lib/data";

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const course = await getCourseBySlug(slug);

  if (!course || !course.modules?.some((module) => module.lessons.some((lesson) => lesson.id === lessonId))) {
    notFound();
  }

  return <LessonPlayerClient course={course} initialLessonId={lessonId} />;
}
