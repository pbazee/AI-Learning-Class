import { notFound, redirect } from "next/navigation";
import { LessonPlayerClient } from "@/components/learn/LessonPlayerClient";
import { getExpiredTimedCourseAccess } from "@/lib/access-control";
import { getAskAiSettings } from "@/lib/ask-ai-settings";
import { getCourseByLessonId, getCourseBySlug, getCurrentUserProfile, getUserCourseAccessMap } from "@/lib/data";
import { getCourseProgressState, getLessonNotes } from "@/lib/lesson-player";

export default async function LessonPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
  searchParams?: Promise<{ lesson?: string }>;
}) {
  const { slug, lessonId } = await params;
  const requestedSearchParams = searchParams ? await searchParams : undefined;
  const requestedLessonId = requestedSearchParams?.lesson || lessonId;
  const [viewer, courseBySlug, askAiSettings] = await Promise.all([
    getCurrentUserProfile(),
    getCourseBySlug(slug),
    getAskAiSettings(),
  ]);
  let course = courseBySlug;

  const hasRequestedLesson =
    course?.modules?.some((module) => module.lessons.some((lesson) => lesson.id === requestedLessonId)) ?? false;

  if (!hasRequestedLesson) {
    const courseByLesson = await getCourseByLessonId(requestedLessonId);
    if (courseByLesson) {
      course = courseByLesson;
    }
  }

  if (!course) {
    notFound();
  }

  if (course.slug !== slug) {
    redirect(`/learn/${course.slug}/${lessonId}`);
  }

  const orderedLessons = course.modules?.flatMap((module) => module.lessons) ?? [];
  const requestedLesson = orderedLessons.find((lesson) => lesson.id === requestedLessonId) ?? null;

  if (!requestedLesson) {
    const fallbackLesson = orderedLessons[0];

    if (fallbackLesson) {
      redirect(`/learn/${course.slug}/${fallbackLesson.id}`);
    }

    notFound();
  }

  const [courseAccessMap, progressAndNotes] = viewer
    ? await Promise.all([
        getUserCourseAccessMap(viewer.id, [course.id]),
        Promise.all([
          getCourseProgressState(viewer.id, course.id),
          getLessonNotes(viewer.id, requestedLessonId),
        ]).then(([progress, notes]) => ({ progress, notes })),
      ])
    : [{}, null];
  const hasFullCourseAccess = Boolean(
    (courseAccessMap as Record<string, { hasAccess?: boolean }>)[course.id]?.hasAccess
  ) || course.isFree || course.price === 0;
  const expiredAccess =
    viewer && !hasFullCourseAccess ? await getExpiredTimedCourseAccess(viewer.id, course.id) : null;

  if (!hasFullCourseAccess && !requestedLesson.isPreview) {
    if (expiredAccess) {
      redirect("/pricing?reason=expired");
    }

    redirect(`/courses/${course.slug}`);
  }

  return (
    <LessonPlayerClient
      course={course}
      initialLessonId={requestedLessonId}
      viewerId={viewer?.id ?? null}
      initialCompletedLessonIds={progressAndNotes?.progress.completedLessonIds ?? []}
      initialLessonProgressMap={progressAndNotes?.progress.lessonProgressByLessonId ?? {}}
      initialNotes={progressAndNotes?.notes ?? []}
      initialNoteContent={progressAndNotes?.notes[0]?.content ?? ""}
      hasFullCourseAccess={hasFullCourseAccess}
      askAiEnabled={askAiSettings.enabled}
      askAiAssistantLabel={askAiSettings.assistantLabel}
    />
  );
}
