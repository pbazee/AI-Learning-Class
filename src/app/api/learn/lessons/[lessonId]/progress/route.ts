import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserCourseAccessMap } from "@/lib/data";
import { recordUserCourseOwnership } from "@/lib/learner-records";
import { syncCourseEnrollmentCount } from "@/lib/course-metrics";
import { prisma } from "@/lib/prisma";
import { ensureLessonProgressColumns, getCourseProgressState } from "@/lib/lesson-player";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";

const progressPayloadSchema = z.object({
  isCompleted: z.boolean().optional(),
  touchOnly: z.boolean().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  watchedSeconds: z.number().min(0).optional(),
  lastPdfPage: z.number().int().min(1).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Please sign in to track your lesson progress." }, { status: 401 });
    }

    const profile = await syncAuthenticatedUser(user);

    if (!profile) {
      return NextResponse.json({ error: "Unable to verify your account." }, { status: 400 });
    }

    const payload = progressPayloadSchema.parse(await request.json());
    await ensureLessonProgressColumns();
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        module: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    const accessMap = await getUserCourseAccessMap(profile.id, [lesson.module.courseId]);
    const courseAccess = accessMap[lesson.module.courseId];

    if (!courseAccess?.hasAccess) {
      return NextResponse.json({ error: "You do not have access to this course yet." }, { status: 403 });
    }

    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: profile.id,
          courseId: lesson.module.courseId,
        },
      },
      update: {
        expiresAt: courseAccess.expiresAt ? new Date(courseAccess.expiresAt) : null,
      },
      create: {
        userId: profile.id,
        courseId: lesson.module.courseId,
        status: "ACTIVE",
        expiresAt: courseAccess.expiresAt ? new Date(courseAccess.expiresAt) : null,
      },
    });

    await recordUserCourseOwnership(profile.id, [lesson.module.courseId], {
      accessSource: courseAccess.accessSource ?? "subscription",
      lifetimeAccess: !courseAccess.expiresAt,
      expiresAt: courseAccess.expiresAt ? new Date(courseAccess.expiresAt) : null,
      ownedAt: new Date(),
    });
    await syncCourseEnrollmentCount(lesson.module.courseId);

    const existingProgress = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: profile.id,
          lessonId,
        },
      },
      select: {
        progressPercent: true,
        watchedSeconds: true,
        lastPdfPage: true,
        isCompleted: true,
      },
    });

    if (payload.touchOnly) {
      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId: profile.id,
            lessonId,
          },
        },
        update: {
          watchedSeconds: {
            increment: 0,
          },
        },
        create: {
          userId: profile.id,
          lessonId,
          isCompleted: false,
          progressPercent: 0,
          completedAt: null,
        },
      });
    } else if (
      typeof payload.isCompleted === "boolean" ||
      typeof payload.progressPercent === "number" ||
      typeof payload.watchedSeconds === "number"
    ) {
      const nextProgressPercent =
        typeof payload.progressPercent === "number"
          ? Math.max(existingProgress?.progressPercent ?? 0, payload.progressPercent)
          : payload.isCompleted
            ? 100
            : payload.isCompleted === false
              ? Math.min(existingProgress?.progressPercent ?? 0, 99)
              : existingProgress?.progressPercent ?? 0;
      const nextWatchedSeconds =
        typeof payload.watchedSeconds === "number"
          ? Math.max(existingProgress?.watchedSeconds ?? 0, Math.round(payload.watchedSeconds))
          : existingProgress?.watchedSeconds ?? 0;
      const nextLastPdfPage =
        typeof payload.lastPdfPage === "number"
          ? Math.max(1, Math.round(payload.lastPdfPage))
          : existingProgress?.lastPdfPage ?? null;
      const nextIsCompleted =
        payload.isCompleted === true
          ? true
          : payload.isCompleted === false
            ? false
            : nextProgressPercent >= 100 || existingProgress?.isCompleted === true;

      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId: profile.id,
            lessonId,
          },
        },
        update: {
          isCompleted: nextIsCompleted,
          progressPercent: nextProgressPercent,
          watchedSeconds: nextWatchedSeconds,
          lastPdfPage: nextLastPdfPage,
          completedAt: nextIsCompleted ? new Date() : null,
        },
        create: {
          userId: profile.id,
          lessonId,
          isCompleted: nextIsCompleted,
          progressPercent: nextProgressPercent,
          watchedSeconds: nextWatchedSeconds,
          lastPdfPage: nextLastPdfPage,
          completedAt: nextIsCompleted ? new Date() : null,
        },
      });
    } else {
      return NextResponse.json({ error: "Please choose a valid progress update." }, { status: 400 });
    }

    const progress = await getCourseProgressState(profile.id, lesson.module.courseId);

    if (progress.percentage === 100) {
      await prisma.enrollment.update({
        where: {
          userId_courseId: {
            userId: profile.id,
            courseId: lesson.module.courseId,
          },
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("[learn.lesson.progress] Unable to update lesson progress.", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Please choose a valid progress state." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to update this lesson right now." },
      { status: 500 }
    );
  }
}
