import { notFound, redirect } from "next/navigation";
import { LessonPlayerClient } from "@/components/learn/LessonPlayerClient";
import { getCourseByLessonId, getCourseBySlug, getCurrentUserProfile, getUserCourseAccessMap } from "@/lib/data";
import { getCourseProgressState, getLessonNotes } from "@/lib/lesson-player";

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const [viewer, courseBySlug] = await Promise.all([getCurrentUserProfile(), getCourseBySlug(slug)]);
  let course = courseBySlug;

  const hasRequestedLesson =
    course?.modules?.some((module) => module.lessons.some((lesson) => lesson.id === lessonId)) ?? false;

  if (!hasRequestedLesson) {
    course = await getCourseByLessonId(lessonId);
  }

  const resolvedLessonExists =
    course?.modules?.some((module) => module.lessons.some((lesson) => lesson.id === lessonId)) ?? false;

  if (!course || !resolvedLessonExists) {
    notFound();
  }

  if (course.slug !== slug) {
    redirect(`/learn/${course.slug}/${lessonId}`);
  }

  const requestedLesson =
    course.modules?.flatMap((module) => module.lessons).find((lesson) => lesson.id === lessonId) ?? null;

  if (!requestedLesson) {
    notFound();
  }

  const courseAccessMap =
    viewer ? await getUserCourseAccessMap(viewer.id, [course.id]) : {};
  const hasFullCourseAccess = Boolean(courseAccessMap[course.id]?.hasAccess);

  if (!hasFullCourseAccess && !requestedLesson.isPreview) {
    redirect(`/courses/${course.slug}`);
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
      hasFullCourseAccess={hasFullCourseAccess}
    />
  );
}
