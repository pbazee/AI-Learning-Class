import { notFound } from "next/navigation";
import { LessonPlayerClient } from "@/components/learn/LessonPlayerClient";
import { getCourseBySlug, getCurrentUserProfile } from "@/lib/data";
import { getCourseProgressState, getLessonNotes } from "@/lib/lesson-player";

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const [course, viewer] = await Promise.all([getCourseBySlug(slug), getCurrentUserProfile()]);

  if (!course || !course.modules?.some((module) => module.lessons.some((lesson) => lesson.id === lessonId))) {
    notFound();
  }

  const playerState = viewer
    ? await Promise.all([
        getCourseProgressState(viewer.id, course.id),
        getLessonNotes(viewer.id, lessonId),
      ]).then(([progress, notes]) => ({
        progress,
        notes,
      }))
    : null;

  return (
    <LessonPlayerClient
      course={course}
      initialLessonId={lessonId}
      viewerId={viewer?.id ?? null}
      initialCompletedLessonIds={playerState?.progress.completedLessonIds ?? []}
      initialNotes={playerState?.notes ?? []}
      initialNoteContent={playerState?.notes[0]?.content ?? ""}
    />
  );
}
