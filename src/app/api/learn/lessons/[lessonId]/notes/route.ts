import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createLessonNote, getLessonNotes } from "@/lib/lesson-player";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";

const notesPayloadSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Add a few words before saving your notes.")
    .max(20000, "Notes are too long. Please split them into smaller saved snapshots."),
});

async function resolveAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return syncAuthenticatedUser(user);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const profile = await resolveAuthenticatedUser();

    if (!profile) {
      return NextResponse.json({ error: "Please sign in to view your lesson notes." }, { status: 401 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    const notes = await getLessonNotes(profile.id, lessonId);

    return NextResponse.json({
      success: true,
      notes,
      latestContent: notes[0]?.content ?? "",
    });
  } catch (error) {
    console.error("[learn.lesson.notes] Unable to load lesson notes.", error);
    return NextResponse.json(
      { error: "Unable to load your notes right now." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const profile = await resolveAuthenticatedUser();

    if (!profile) {
      return NextResponse.json({ error: "Please sign in to save notes." }, { status: 401 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    const payload = notesPayloadSchema.parse(await request.json());
    const note = await createLessonNote(profile.id, lessonId, payload.content);

    if (!note) {
      return NextResponse.json({ error: "Unable to save your notes right now." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      note,
    });
  } catch (error) {
    console.error("[learn.lesson.notes] Unable to save lesson notes.", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Please review your note before saving." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to save your notes right now." },
      { status: 500 }
    );
  }
}
