import { NextResponse } from "next/server";
import { getPublicCourseCatalogData } from "@/lib/data";
import {
  getRecommendedCourses,
  isValidOnboardingQuizAnswers,
} from "@/lib/onboarding";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Course } from "@/types";

type OnboardingMetadata = {
  onboarding_answers?: Record<string, number>;
  onboarding_recommendations?: string[];
  onboarding_completed_at?: string | null;
};

async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

function readOnboardingMetadata(user: Awaited<ReturnType<typeof getAuthenticatedUser>>) {
  const metadata =
    user?.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  return {
    answers:
      metadata.onboarding_answers &&
      typeof metadata.onboarding_answers === "object" &&
      !Array.isArray(metadata.onboarding_answers)
        ? (metadata.onboarding_answers as Record<string, number>)
        : null,
    recommendationIds: Array.isArray(metadata.onboarding_recommendations)
      ? metadata.onboarding_recommendations.filter(
          (value): value is string => typeof value === "string"
        )
      : [],
    completedAt:
      typeof metadata.onboarding_completed_at === "string"
        ? metadata.onboarding_completed_at
        : null,
  };
}

function buildRecommendedCourses(courses: Course[], recommendationIds: string[]) {
  return recommendationIds
    .map((courseId) => courses.find((course) => course.id === courseId))
    .filter((course): course is Course => Boolean(course));
}

async function updateOnboardingMetadata(
  userId: string,
  existingMetadata: Record<string, unknown>,
  nextMetadata: OnboardingMetadata
) {
  const supabaseAdmin = getSupabaseAdminClient();
  const mergedMetadata = {
    ...existingMetadata,
    ...nextMetadata,
  };

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: mergedMetadata,
  });

  if (error) {
    throw error;
  }
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const { courses } = await getPublicCourseCatalogData();
    const onboarding = readOnboardingMetadata(user);

    return NextResponse.json({
      completed: Boolean(onboarding.completedAt),
      answers: onboarding.answers,
      recommendations: buildRecommendedCourses(courses, onboarding.recommendationIds),
    });
  } catch (error) {
    console.error("[account.onboarding] Unable to load onboarding state.", error);
    return NextResponse.json(
      { error: "Unable to load onboarding right now." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    if (!isValidOnboardingQuizAnswers(body.answers)) {
      return NextResponse.json(
        { error: "Answer all four onboarding questions to continue." },
        { status: 400 }
      );
    }

    const { courses } = await getPublicCourseCatalogData();
    const recommendations = getRecommendedCourses(courses, body.answers, 4);

    await updateOnboardingMetadata(
      user.id,
      (user.user_metadata as Record<string, unknown>) ?? {},
      {
        onboarding_answers: body.answers,
        onboarding_recommendations: recommendations.map((course) => course.id),
      }
    );

    return NextResponse.json({
      recommendations,
    });
  } catch (error) {
    console.error("[account.onboarding] Unable to save quiz answers.", error);
    return NextResponse.json(
      { error: "Unable to save your onboarding answers right now." },
      { status: 500 }
    );
  }
}

export async function PATCH() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    await updateOnboardingMetadata(
      user.id,
      (user.user_metadata as Record<string, unknown>) ?? {},
      {
        onboarding_completed_at: new Date().toISOString(),
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[account.onboarding] Unable to complete onboarding.", error);
    return NextResponse.json(
      { error: "Unable to complete onboarding right now." },
      { status: 500 }
    );
  }
}
