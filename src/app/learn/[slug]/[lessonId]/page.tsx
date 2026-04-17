import { notFound, redirect } from "next/navigation";
import { ExpiredSubscriptionNotice } from "@/components/courses/ExpiredSubscriptionNotice";
import { LessonPlayerClient } from "@/components/learn/LessonPlayerClient";
import { getExpiredTimedCourseAccess } from "@/lib/access-control";
import { getAskAiSettings } from "@/lib/ask-ai-settings";
import { getCourseByLessonId, getCourseBySlug, getCurrentUserProfile, getUserCourseAccessMap } from "@/lib/data";
import { getCourseProgressState, getLessonNotes } from "@/lib/lesson-player";

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const [viewer, courseBySlug, askAiSettings] = await Promise.all([
    getCurrentUserProfile(),
    getCourseBySlug(slug),
    getAskAiSettings(),
  ]);
  let course = courseBySlug;

  const hasRequestedLesson =
    course?.modules?.some((module) => module.lessons.some((lesson) => lesson.id === lessonId)) ?? false;

  if (!hasRequestedLesson) {
    const courseByLesson = await getCourseByLessonId(lessonId);
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
  const requestedLesson = orderedLessons.find((lesson) => lesson.id === lessonId) ?? null;

  if (!requestedLesson) {
    const fallbackLesson = orderedLessons[0];

    if (fallbackLesson) {
      redirect(`/learn/${course.slug}/${fallbackLesson.id}`);
    }

    notFound();
  }

  const courseAccessMap =
    viewer ? await getUserCourseAccessMap(viewer.id, [course.id]) : {};
  const hasFullCourseAccess = Boolean(courseAccessMap[course.id]?.hasAccess);
  const expiredAccess =
    viewer && !hasFullCourseAccess ? await getExpiredTimedCourseAccess(viewer.id, course.id) : null;

  if (!hasFullCourseAccess && !requestedLesson.isPreview) {
    if (expiredAccess) {
      return (
        <div className="min-h-screen bg-[#04070d] px-4 py-16 sm:px-6">
          <ExpiredSubscriptionNotice
            renewHref={`/checkout?plan=${expiredAccess.planSlug === "teams" ? "teams" : "pro"}&billing=${expiredAccess.billingCycle ?? "monthly"}`}
          />
        </div>
      );
    }

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
      initialLessonProgressMap={playerState?.progress.lessonProgressByLessonId ?? {}}
      initialNotes={playerState?.notes ?? []}
      initialNoteContent={playerState?.notes[0]?.content ?? ""}
      hasFullCourseAccess={hasFullCourseAccess}
      askAiEnabled={askAiSettings.enabled}
      askAiAssistantLabel={askAiSettings.assistantLabel}
    />
  );
}
