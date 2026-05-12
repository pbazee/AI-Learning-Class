import { NextResponse } from "next/server";
import { getPublicCourseCatalogData } from "@/lib/data";
import { isValidOnboardingQuizAnswers } from "@/lib/onboarding";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaMismatchError } from "@/lib/prisma-errors";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Course, OnboardingQuizAnswers } from "@/types";
import { Prisma } from "@prisma/client";

type OnboardingMetadata = {
  onboarding_answers?: OnboardingQuizAnswers;
  onboarding_recommendations?: string[];
  onboarding_completed_at?: string | null;
};

function toJsonb(value: unknown) {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

function normalizeAnswers(value: unknown) {
  return isValidOnboardingQuizAnswers(value) ? value : null;
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
        ? (metadata.onboarding_answers as OnboardingQuizAnswers)
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

async function getRecommendations(quizAnswers: OnboardingQuizAnswers, limit = 3) {
  const levelMap: Record<string, Course["level"]> = {
    beginner: "BEGINNER",
    basics: "BEGINNER",
    intermediate: "INTERMEDIATE",
    advanced: "ADVANCED",
  };
  const level = levelMap[quizAnswers.experience] || "BEGINNER";
  const categoryId = quizAnswers.category_id;

  const mapCourse = (
    course: Awaited<ReturnType<typeof prisma.course.findMany>>[number] & {
      category: { name: string };
    }
  ) =>
    ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      shortDescription: course.shortDescription ?? undefined,
      imageUrl: course.imageUrl ?? undefined,
      imagePath: course.imagePath ?? undefined,
      thumbnailUrl: course.thumbnailUrl ?? undefined,
      previewVideoUrl: course.previewVideoUrl ?? undefined,
      categoryId: course.categoryId,
      categoryName: course.category.name,
      level: course.level,
      price: course.price,
      originalPrice: course.originalPrice ?? undefined,
      currency: course.currency,
      isFree: course.isFree,
      isFeatured: course.isFeatured,
      isTrending: course.isTrending,
      isRecommended: course.isRecommended,
      isNew: course.isNew,
      totalDuration: course.totalDuration,
      totalLessons: course.totalLessons,
      totalStudents: course.totalStudents,
      rating: course.rating,
      totalRatings: course.totalRatings,
      tags: course.tags,
      whatYouLearn: course.whatYouLearn,
      requirements: course.requirements,
      language: course.language,
    } satisfies Course);

  const recommendations: Course[] = [];
  const seen = new Set<string>();
  const pushCourses = (courses: Course[]) => {
    for (const course of courses) {
      if (seen.has(course.id)) continue;
      seen.add(course.id);
      recommendations.push(course);
    }
  };

  pushCourses(
    (
      await prisma.course.findMany({
        where: {
          isPublished: true,
          categoryId,
          level,
        },
        include: {
          category: {
            select: { name: true },
          },
        },
        take: limit,
      })
    ).map(mapCourse)
  );

  if (recommendations.length < limit) {
    pushCourses(
      (
        await prisma.course.findMany({
          where: {
            isPublished: true,
            categoryId,
          },
          include: {
            category: {
              select: { name: true },
            },
          },
          take: limit,
        })
      ).map(mapCourse)
    );
  }

  if (recommendations.length < limit) {
    pushCourses(
      (
        await prisma.course.findMany({
          where: {
            isPublished: true,
            isFeatured: true,
          },
          include: {
            category: {
              select: { name: true },
            },
          },
          take: limit,
        })
      ).map(mapCourse)
    );
  }

  return recommendations.slice(0, limit);
}

function isRecommendationSerializationError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    message.includes("serialize value") &&
    message.includes("jsonb") &&
    message.includes("value is a list")
  );
}

async function getOnboardingProfile(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        quizAnswers: true,
        onboardingRecommendations: true,
        onboardingCompleted: true,
        onboardingCompletedAt: true,
      },
    });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      return null;
    }

    throw error;
  }
}

async function updateOnboardingProfileAnswers(
  userId: string,
  answers: OnboardingQuizAnswers,
  recommendationIds: string[]
) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        quizAnswers: toJsonb(answers),
        ...(recommendationIds.length > 0
          ? { onboardingRecommendations: recommendationIds }
          : {}),
      },
    });
  } catch (error) {
    if (isRecommendationSerializationError(error)) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          quizAnswers: toJsonb(answers),
        },
      });
      return;
    }

    if (isPrismaSchemaMismatchError(error)) {
      return;
    }

    console.error("[account.onboarding] Unable to persist onboarding answers to Prisma.", error);
  }
}

async function markOnboardingCompleted(userId: string, completedAt: Date) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: completedAt,
      },
    });
  } catch (error) {
    if (!isPrismaSchemaMismatchError(error)) {
      throw error;
    }
  }
}

async function updateOnboardingCompletionState(
  userId: string,
  {
    onboardingCompleted,
    onboardingCompletedAt,
    recommendationIds,
  }: {
    onboardingCompleted: boolean;
    onboardingCompletedAt: Date | null;
    recommendationIds: string[];
  }
) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted,
        onboardingCompletedAt,
        onboardingRecommendations: recommendationIds,
      },
    });
  } catch (error) {
    if (isRecommendationSerializationError(error)) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          onboardingCompleted,
          onboardingCompletedAt,
        },
      });
      return;
    }

    throw error;
  }
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

    const [courses, categories, profile] = await Promise.all([
      getPublicCourseCatalogData().then((result) => result.courses),
      prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: { name: "asc" },
      }),
      getOnboardingProfile(user.id),
    ]);
    const onboarding = readOnboardingMetadata(user);
    const profileAnswers = normalizeAnswers(profile?.quizAnswers);
    const recommendationIds =
      profile?.onboardingRecommendations?.length
        ? profile.onboardingRecommendations
        : onboarding.recommendationIds;

    return NextResponse.json({
      completed: Boolean(profile?.onboardingCompleted || profile?.onboardingCompletedAt || onboarding.completedAt),
      answers: profileAnswers ?? onboarding.answers,
      categories: categories.slice(0, 6),
      recommendations: buildRecommendedCourses(courses, recommendationIds),
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

    const recommendations = await getRecommendations(body.answers, 3);

    await updateOnboardingProfileAnswers(
      user.id,
      body.answers,
      recommendations.map((course) => course.id)
    );

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

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const existingProfile = await getOnboardingProfile(user.id);
    const body = await request.json().catch(() => ({}));
    const recommendationIds = Array.isArray(body.recommendationIds)
      ? (body.recommendationIds as unknown[]).filter((value): value is string => typeof value === "string")
      : existingProfile?.onboardingRecommendations ?? [];
    const resetRecommendations = body.reset === true;

    const completedAt = new Date();

    await updateOnboardingCompletionState(user.id, {
      onboardingCompleted: true,
      onboardingCompletedAt: completedAt,
      recommendationIds: resetRecommendations ? [] : recommendationIds,
    });

    await updateOnboardingMetadata(
      user.id,
      (user.user_metadata as Record<string, unknown>) ?? {},
      {
        onboarding_recommendations: resetRecommendations ? [] : recommendationIds,
        onboarding_completed_at: completedAt.toISOString(),
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

export async function DELETE() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    await updateOnboardingCompletionState(user.id, {
      onboardingCompleted: false,
      onboardingCompletedAt: null,
      recommendationIds: [],
    });

    await updateOnboardingMetadata(
      user.id,
      (user.user_metadata as Record<string, unknown>) ?? {},
      {
        onboarding_recommendations: [],
        onboarding_completed_at: null,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[account.onboarding] Unable to reset onboarding.", error);
    return NextResponse.json(
      { error: "Unable to reset onboarding right now." },
      { status: 500 }
    );
  }
}
