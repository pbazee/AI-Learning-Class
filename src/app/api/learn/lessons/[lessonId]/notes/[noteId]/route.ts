import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteLessonNote } from "@/lib/lesson-player";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string; noteId: string }> }
) {
  try {
    const { lessonId, noteId } = await params;
    const profile = await resolveAuthenticatedUser();

    if (!profile) {
      return NextResponse.json({ error: "Please sign in to manage your notes." }, { status: 401 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    const deleted = await deleteLessonNote(profile.id, lessonId, noteId);

    if (!deleted) {
      return NextResponse.json({ error: "Unable to delete this note right now." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[learn.lesson.notes] Unable to delete lesson note.", error);
    return NextResponse.json(
      { error: "Unable to delete this note right now." },
      { status: 500 }
    );
  }
}
