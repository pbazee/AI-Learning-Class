import { NextResponse } from "next/server";
import { z } from "zod";
import { getLessonProgressRequestContext, toLessonProgressErrorResponse } from "@/lib/lesson-progress-api";
import { getLessonProgressEntry, upsertLessonProgressEntry } from "@/lib/lesson-player";

const patchProgressSchema = z.object({
  lessonId: z.string().min(1),
  contentType: z.enum(["video", "audio", "pdf"]).optional(),
  touchOnly: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  manualCompletionState: z.enum(["COMPLETE", "INCOMPLETE"]).optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  lastPosition: z.number().min(0).nullable().optional(),
  lastPage: z.number().int().min(1).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lessonId");

    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required." }, { status: 400 });
    }

    const { profile } = await getLessonProgressRequestContext(lessonId);
    const progress = await getLessonProgressEntry(profile.id, lessonId);

    return NextResponse.json({ progress });
  } catch (error) {
    const handled = toLessonProgressErrorResponse(error);
    if (handled) {
      return handled;
    }

    console.error("[api.progress.GET] Unable to load lesson progress.", error);
    return NextResponse.json({ error: "Unable to load lesson progress right now." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = patchProgressSchema.parse(await request.json());

    if (
      !payload.touchOnly &&
      typeof payload.progressPercent !== "number" &&
      typeof payload.lastPosition !== "number" &&
      typeof payload.lastPage !== "number" &&
      payload.lastPosition !== null &&
      payload.lastPage !== null &&
      typeof payload.isCompleted !== "boolean" &&
      typeof payload.manualCompletionState !== "string"
    ) {
      return NextResponse.json({ error: "Please choose a valid progress update." }, { status: 400 });
    }

    const { profile, lesson, courseId } = await getLessonProgressRequestContext(payload.lessonId, {
      ensureEnrollment: true,
    });
    const result = await upsertLessonProgressEntry({
      userId: profile.id,
      lessonId: payload.lessonId,
      courseId,
      lessonType: lesson.type,
      contentType: payload.contentType,
      touchOnly: payload.touchOnly,
      isCompleted: payload.isCompleted,
      manualCompletionState: payload.manualCompletionState,
      progressPercent: payload.progressPercent,
      lastPosition: payload.lastPosition,
      lastPage: payload.lastPage,
    });

    return NextResponse.json({
      success: true,
      progress: result.progress,
      courseProgress: result.courseProgress,
    });
  } catch (error) {
    const handled = toLessonProgressErrorResponse(error);
    if (handled) {
      return handled;
    }

    console.error("[api.progress.PATCH] Unable to update lesson progress.", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Please choose a valid progress update." },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Unable to update lesson progress right now." }, { status: 500 });
  }
}
