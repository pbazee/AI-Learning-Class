import { NextResponse } from "next/server";
import { z } from "zod";
import { getLessonProgressRequestContext, toLessonProgressErrorResponse } from "@/lib/lesson-progress-api";
import { upsertLessonProgressEntry } from "@/lib/lesson-player";

const progressPayloadSchema = z.object({
  isCompleted: z.boolean().optional(),
  manualCompletionState: z.enum(["COMPLETE", "INCOMPLETE"]).optional(),
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
    const payload = progressPayloadSchema.parse(await request.json());

    if (
      !payload.touchOnly &&
      typeof payload.isCompleted !== "boolean" &&
      typeof payload.manualCompletionState !== "string" &&
      typeof payload.progressPercent !== "number" &&
      typeof payload.watchedSeconds !== "number" &&
      typeof payload.lastPdfPage !== "number"
    ) {
      return NextResponse.json({ error: "Please choose a valid progress update." }, { status: 400 });
    }

    const { profile, lesson, courseId } = await getLessonProgressRequestContext(lessonId, {
      ensureEnrollment: true,
    });
    const result = await upsertLessonProgressEntry({
      userId: profile.id,
      lessonId,
      courseId,
      lessonType: lesson.type,
      touchOnly: payload.touchOnly,
      isCompleted: payload.isCompleted,
      manualCompletionState: payload.manualCompletionState,
      progressPercent: payload.progressPercent,
      lastPosition: payload.watchedSeconds,
      lastPage: payload.lastPdfPage,
    });

    return NextResponse.json({
      success: true,
      progress: result.courseProgress,
      lessonProgress: result.progress,
    });
  } catch (error) {
    const handled = toLessonProgressErrorResponse(error);
    if (handled) {
      return handled;
    }

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
