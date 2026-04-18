import "server-only";

import { NextResponse } from "next/server";
import { getUserCourseAccessMap } from "@/lib/data";
import { recordUserCourseOwnership } from "@/lib/learner-records";
import { syncCourseEnrollmentCount } from "@/lib/course-metrics";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";

export class LessonProgressApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "LessonProgressApiError";
  }
}

export async function getLessonProgressRequestContext(
  lessonId: string,
  options?: { ensureEnrollment?: boolean }
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new LessonProgressApiError("Please sign in to track your lesson progress.", 401);
  }

  const profile = await syncAuthenticatedUser(user);

  if (!profile) {
    throw new LessonProgressApiError("Unable to verify your account.", 400);
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      type: true,
      module: {
        select: {
          courseId: true,
        },
      },
    },
  });

  if (!lesson) {
    throw new LessonProgressApiError("Lesson not found.", 404);
  }

  const courseId = lesson.module.courseId;
  const accessMap = await getUserCourseAccessMap(profile.id, [courseId]);
  const courseAccess = accessMap[courseId];

  if (!courseAccess?.hasAccess) {
    throw new LessonProgressApiError("You do not have access to this course yet.", 403);
  }

  if (options?.ensureEnrollment) {
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: profile.id,
          courseId,
        },
      },
      update: {
        expiresAt: courseAccess.expiresAt ? new Date(courseAccess.expiresAt) : null,
      },
      create: {
        userId: profile.id,
        courseId,
        status: "ACTIVE",
        expiresAt: courseAccess.expiresAt ? new Date(courseAccess.expiresAt) : null,
      },
    });

    await recordUserCourseOwnership(profile.id, [courseId], {
      accessSource: courseAccess.accessSource ?? "subscription",
      lifetimeAccess: !courseAccess.expiresAt,
      expiresAt: courseAccess.expiresAt ? new Date(courseAccess.expiresAt) : null,
      ownedAt: new Date(),
    });
    await syncCourseEnrollmentCount(courseId);
  }

  return {
    profile,
    lesson,
    courseId,
  };
}

export function toLessonProgressErrorResponse(error: unknown) {
  if (error instanceof LessonProgressApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return null;
}
