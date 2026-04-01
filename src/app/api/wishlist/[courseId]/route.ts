import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import { toggleUserWishlistCourse } from "@/lib/learner-records";

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
      return NextResponse.json({ error: "Please sign in to save courses to your wishlist." }, { status: 401 });
    }

    const profile = await syncAuthenticatedUser(user);

    if (!profile) {
      return NextResponse.json({ error: "Unable to verify your account." }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, isPublished: true },
    });

    if (!course || !course.isPublished) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const result = await toggleUserWishlistCourse(profile.id, courseId);

    return NextResponse.json({
      success: true,
      wishlisted: result.wishlisted,
      courseTitle: course.title,
    });
  } catch (error) {
    console.error("[wishlist.toggle] Unable to update course wishlist.", error);
    return NextResponse.json(
      { error: "Unable to update your wishlist right now." },
      { status: 500 }
    );
  }
}
