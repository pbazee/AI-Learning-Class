import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import { syncCourseReviewMetrics } from "@/lib/course-reviews";

const reviewPayloadSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(3).max(2000),
});

export async function POST(
  request: Request,
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
      return NextResponse.json({ error: "Please sign in to leave a review." }, { status: 401 });
    }

    const profile = await syncAuthenticatedUser(user);

    if (!profile) {
      return NextResponse.json({ error: "Unable to verify your account." }, { status: 400 });
    }

    const payload = reviewPayloadSchema.parse(await request.json());
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true },
    });

    if (!course || !course.isPublished) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const review = await prisma.review.upsert({
      where: {
        userId_courseId: {
          userId: profile.id,
          courseId,
        },
      },
      update: {
        rating: payload.rating,
        body: payload.body,
        title: null,
        isApproved: true,
        isFeatured: false,
      },
      create: {
        userId: profile.id,
        courseId,
        rating: payload.rating,
        body: payload.body,
        isApproved: true,
        isFeatured: false,
      },
    });

    await syncCourseReviewMetrics(courseId);

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
      },
    });
  } catch (error) {
    console.error("[courses.reviews] Unable to submit review.", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Please review your rating and comment." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to save your review right now." },
      { status: 500 }
    );
  }
}
