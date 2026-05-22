import { NextResponse } from "next/server";
import { getCurrentUserProfile, getUserEnrollments } from "@/lib/data";

export async function GET() {
  try {
    const user = await getCurrentUserProfile();

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const enrollments = await getUserEnrollments(user.id);
    return NextResponse.json({ enrollments });
  } catch (error) {
    console.error("[dashboard-courses] Unable to load dashboard course progress.", error);
    return NextResponse.json(
      { error: "Unable to load your course progress right now." },
      { status: 500 }
    );
  }
}
