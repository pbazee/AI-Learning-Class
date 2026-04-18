import "server-only";

import type { CourseAccessState, CoursePreviewLessonState, CoursePreviewState, Lesson } from "@/types";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { env } from "@/lib/config";

type PreviewPayload = {
  courseAccess?: {
    accessSource?: CourseAccessState["accessSource"];
    actionLabel?: CourseAccessState["actionLabel"];
    completedLessons?: number;
    courseId?: string;
    expiresAt?: string | null;
    hasAccess?: boolean;
    lastLessonTitle?: string | null;
    lessonHref?: string;
    progress?: number;
    statusLabel?: CourseAccessState["statusLabel"];
    totalLessons?: number;
  } | null;
  courseCurrency?: string | null;
  courseId?: string;
  coursePrice?: number;
  courseSlug?: string;
  courseTitle?: string;
  isFreeCourse?: boolean;
  previewLessons?: Array<{
    content?: string | null;
    duration?: number | null;
    id?: string;
    moduleTitle?: string | null;
    previewMinutes?: number | null;
    previewPages?: number | null;
    sourceUrl?: string | null;
    title?: string;
    type?: Lesson["type"] | null;
  }> | null;
  previewVideoUrl?: string | null;
  thumbnailUrl?: string | null;
} | null;

const supportedLessonTypes: Lesson["type"][] = [
  "VIDEO",
  "AUDIO",
  "PDF",
  "TEXT",
  "QUIZ",
  "ASSIGNMENT",
  "PROJECT",
  "LIVE",
];

function isSupportedLessonType(value?: string | null): value is Lesson["type"] {
  return Boolean(value && supportedLessonTypes.includes(value as Lesson["type"]));
}

function normalizePreviewLessons(
  previewLessons: NonNullable<PreviewPayload>["previewLessons"]
): CoursePreviewLessonState[] {
  if (!Array.isArray(previewLessons)) {
    return [];
  }

  return previewLessons.flatMap<CoursePreviewLessonState>((lesson) => {
    if (!lesson?.id || !lesson.title || !isSupportedLessonType(lesson.type)) {
      return [];
    }

    return [
      {
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        sourceUrl: lesson.sourceUrl?.trim() || undefined,
        content: lesson.content?.trim() || undefined,
        duration: lesson.duration ?? undefined,
        previewMinutes: lesson.previewMinutes ?? undefined,
        previewPages: lesson.previewPages ?? undefined,
        moduleTitle: lesson.moduleTitle?.trim() || undefined,
      },
    ];
  });
}

function normalizeCourseAccess(
  courseId: string,
  access?: NonNullable<PreviewPayload>["courseAccess"]
): CourseAccessState | undefined {
  if (!access?.hasAccess || !access.lessonHref || !access.statusLabel || !access.actionLabel) {
    return undefined;
  }

  return {
    courseId,
    hasAccess: true,
    statusLabel: access.statusLabel,
    actionLabel: access.actionLabel,
    lessonHref: access.lessonHref,
    progress: access.progress ?? 0,
    completedLessons: access.completedLessons ?? 0,
    totalLessons: access.totalLessons ?? 0,
    lastLessonTitle: access.lastLessonTitle ?? undefined,
    accessSource: access.accessSource,
    expiresAt: access.expiresAt ?? null,
  };
}

function normalizePreviewPayload(payload: PreviewPayload): CoursePreviewState | null {
  if (!payload?.courseId || !payload.courseSlug || !payload.courseTitle) {
    return null;
  }

  return {
    courseId: payload.courseId,
    courseSlug: payload.courseSlug,
    courseTitle: payload.courseTitle,
    thumbnailUrl: payload.thumbnailUrl?.trim() || undefined,
    previewVideoUrl: payload.previewVideoUrl?.trim() || undefined,
    coursePrice: payload.coursePrice ?? 0,
    courseCurrency: payload.courseCurrency?.trim() || undefined,
    isFreeCourse: Boolean(payload.isFreeCourse),
    previewLessons: normalizePreviewLessons(payload.previewLessons),
    courseAccess: normalizeCourseAccess(payload.courseId, payload.courseAccess ?? undefined),
  };
}

export async function getCoursePreviewState(slug: string): Promise<CoursePreviewState | null> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("get_course_preview_state", {
      p_slug: slug,
    });

    if (error) {
      console.error("[course-preview-state] Unable to fetch preview state.", error);
      return null;
    }

    return normalizePreviewPayload((data ?? null) as PreviewPayload);
  } catch (error) {
    console.error("[course-preview-state] Unexpected preview state failure.", error);
    return null;
  }
}
