import "server-only";

import type { CourseAccessState, CoursePreviewLessonState, CoursePreviewState, Lesson } from "@/types";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { env } from "@/lib/config";

type PreviewLessonPayload = {
  assetUrl?: string | null;
  content?: string | null;
  duration?: number | null;
  id?: string;
  moduleTitle?: string | null;
  module_title?: string | null;
  previewMinutes?: number | null;
  previewPages?: number | null;
  preview_minutes?: number | null;
  preview_pages?: number | null;
  sourceUrl?: string | null;
  source_url?: string | null;
  title?: string;
  type?: Lesson["type"] | string | null;
  videoUrl?: string | null;
};

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
  course_id?: string;
  coursePrice?: number;
  courseSlug?: string;
  course_slug?: string;
  courseTitle?: string;
  course_title?: string;
  isFreeCourse?: boolean;
  is_free_course?: boolean;
  previewLessons?: PreviewLessonPayload[] | null;
  preview_lessons?: PreviewLessonPayload[] | null;
  previewVideoUrl?: string | null;
  preview_video_url?: string | null;
  thumbnailUrl?: string | null;
  thumbnail_url?: string | null;
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

function getTrimmedString(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function normalizePreviewLessons(
  previewLessons: NonNullable<PreviewPayload>["previewLessons"] | NonNullable<PreviewPayload>["preview_lessons"]
): CoursePreviewLessonState[] {
  if (!Array.isArray(previewLessons)) {
    return [];
  }

  return previewLessons.flatMap<CoursePreviewLessonState>((lesson) => {
    const normalizedType =
      typeof lesson?.type === "string" ? lesson.type.trim().toUpperCase() : lesson?.type;

    if (!lesson?.id || !lesson.title || !isSupportedLessonType(normalizedType)) {
      return [];
    }

    return [
      {
        id: lesson.id,
        title: lesson.title,
        type: normalizedType,
        sourceUrl: getTrimmedString(
          lesson.sourceUrl,
          lesson.source_url,
          lesson.videoUrl,
          lesson.assetUrl
        ),
        content: lesson.content?.trim() || undefined,
        duration: lesson.duration ?? undefined,
        previewMinutes: lesson.previewMinutes ?? lesson.preview_minutes ?? undefined,
        previewPages: lesson.previewPages ?? lesson.preview_pages ?? undefined,
        moduleTitle: getTrimmedString(lesson.moduleTitle, lesson.module_title),
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
  if (!payload) {
    return null;
  }

  const courseId = getTrimmedString(payload?.courseId, payload?.course_id);
  const courseSlug = getTrimmedString(payload?.courseSlug, payload?.course_slug);
  const courseTitle = getTrimmedString(payload?.courseTitle, payload?.course_title);

  if (!courseId || !courseSlug || !courseTitle) {
    return null;
  }

  return {
    courseId,
    courseSlug,
    courseTitle,
    thumbnailUrl: getTrimmedString(payload.thumbnailUrl, payload.thumbnail_url),
    previewVideoUrl: getTrimmedString(payload.previewVideoUrl, payload.preview_video_url),
    coursePrice: payload.coursePrice ?? 0,
    courseCurrency: getTrimmedString(payload.courseCurrency),
    isFreeCourse: Boolean(payload.isFreeCourse ?? payload.is_free_course),
    previewLessons: normalizePreviewLessons(payload.previewLessons ?? payload.preview_lessons),
    courseAccess: normalizeCourseAccess(courseId, payload.courseAccess ?? undefined),
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
