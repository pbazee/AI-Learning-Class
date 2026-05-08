import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import { getUserCourseAccessMap } from "@/lib/data";
import { ensureLessonAssetsTable } from "@/lib/lesson-assets-table";
import { sortLessonAssets } from "@/lib/lesson-assets";

async function resolveAuthenticatedProfile() {
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
    await ensureLessonAssetsTable();

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        isPreview: true,
        module: {
          select: {
            courseId: true,
          },
        },
        lessonAssets: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            lessonId: true,
            assetType: true,
            assetUrl: true,
            assetPath: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
            title: true,
            isPrimary: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    if (!lesson.isPreview) {
      const profile = await resolveAuthenticatedProfile();

      if (!profile) {
        return NextResponse.json(
          { error: "Please sign in to access this lesson's resources." },
          { status: 401 }
        );
      }

      const accessMap = await getUserCourseAccessMap(profile.id, [lesson.module.courseId]);

      if (!accessMap[lesson.module.courseId]?.hasAccess) {
        return NextResponse.json(
          { error: "You do not have access to this lesson yet." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      assets: sortLessonAssets(lesson.lessonAssets),
    });
  } catch (error) {
    console.error("[learn.lesson.assets] Unable to load lesson assets.", error);

    return NextResponse.json(
      { error: "Unable to load lesson assets right now." },
      { status: 500 }
    );
  }
}
