import { NextResponse } from "next/server";
import { recordUserCourseOwnership } from "@/lib/learner-records";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Please sign in to enroll in this course." }, { status: 401 });
    }

    const profile = await syncAuthenticatedUser(user);

    if (!profile) {
      return NextResponse.json({ error: "Unable to verify your account." }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        slug: true,
        price: true,
        isFree: true,
        isPublished: true,
        modules: {
          orderBy: { order: "asc" },
          select: {
            lessons: {
              orderBy: { order: "asc" },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!course || !course.isPublished) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (!(course.isFree || course.price === 0)) {
      return NextResponse.json({ error: "Only free courses can be enrolled instantly." }, { status: 400 });
    }

    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: profile.id,
          courseId: course.id,
        },
      },
      update: {
        status: "ACTIVE",
        expiresAt: null,
      },
      create: {
        userId: profile.id,
        courseId: course.id,
        status: "ACTIVE",
      },
    });

    await recordUserCourseOwnership(profile.id, [course.id], {
      accessSource: "free_enrollment",
      lifetimeAccess: true,
      ownedAt: new Date(),
    });

    const firstLessonId = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id))[0];

    return NextResponse.json({
      success: true,
      redirectTo: firstLessonId ? `/learn/${course.slug}/${firstLessonId}` : `/courses/${course.slug}`,
    });
  } catch (error) {
    console.error("[courses.enroll] Unable to enroll learner in free course.", error);
    return NextResponse.json(
      { error: "Unable to enroll in this course right now." },
      { status: 500 }
    );
  }
}
