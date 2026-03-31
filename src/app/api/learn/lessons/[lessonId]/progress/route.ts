import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCourseProgressState } from "@/lib/lesson-player";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";

const progressPayloadSchema = z.object({
  isCompleted: z.boolean().optional(),
  touchOnly: z.boolean().optional(),
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
          completedAt: null,
        },
      });
    } else if (typeof payload.isCompleted === "boolean") {
      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId: profile.id,
            lessonId,
          },
        },
        update: {
          isCompleted: payload.isCompleted,
          completedAt: payload.isCompleted ? new Date() : null,
        },
        create: {
          userId: profile.id,
          lessonId,
          isCompleted: payload.isCompleted,
          completedAt: payload.isCompleted ? new Date() : null,
        },
      });
    } else {
      return NextResponse.json({ error: "Please choose a valid progress update." }, { status: 400 });
    }

    const progress = await getCourseProgressState(profile.id, lesson.module.courseId);

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
