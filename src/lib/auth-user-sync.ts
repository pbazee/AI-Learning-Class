import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Prisma, type Role } from "@prisma/client";
import { prisma } from "./prisma";
import { getPrimaryAdminEmail, normalizeEmail } from "./admin-email";
import { ensureEmailPreferenceForUser, sendWelcomeEmail } from "./email";
import { isPrismaConnectionError, isPrismaSchemaMismatchError } from "./prisma-errors";
import {
  getSupabaseAuthRole,
  hasBulkySupabaseUserMetadata,
  sanitizeSupabaseAuthMetadata,
  syncSupabaseAuthRole,
} from "./supabase-auth-admin";

function generateReferralCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

async function getUniqueReferralCode() {
  let attempt = 0;
  while (attempt < 20) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) return code;
    attempt += 1;
  }
  return `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  bio: true,
  country: true,
  role: true,
  preferredCurrency: true,
  stripeCustomerId: true,
  earnedDiscountCode: true,
  createdAt: true,
  updatedAt: true,
  referralCode: true,
} as const;

function toJsonb(value: unknown) {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toRecommendationField(value: string[]) {
  return value.length > 0 ? value : undefined;
}

function isRecommendationSerializationError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    message.includes("serialize value") &&
    message.includes("jsonb") &&
    message.includes("value is a list")
  );
}

function buildFallbackProfile(user: SupabaseUser, email: string, role: Role) {
  return {
    id: user.id,
    email,
    name:
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) || null,
    bio: null,
    country: null,
    role,
    preferredCurrency: "USD",
    stripeCustomerId: null,
    earnedDiscountCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    referralCode: null,
    onboardingCompleted:
      typeof user.user_metadata?.onboarding_completed_at === "string",
    onboardingCompletedAt:
      typeof user.user_metadata?.onboarding_completed_at === "string"
        ? new Date(user.user_metadata.onboarding_completed_at)
        : null,
    onboardingRecommendations: Array.isArray(user.user_metadata?.onboarding_recommendations)
      ? user.user_metadata.onboarding_recommendations.filter(
          (value): value is string => typeof value === "string"
        )
      : [],
    quizAnswers:
      user.user_metadata?.onboarding_answers &&
      typeof user.user_metadata.onboarding_answers === "object" &&
      !Array.isArray(user.user_metadata.onboarding_answers)
        ? user.user_metadata.onboarding_answers
        : null,
  };
}

export async function syncAuthenticatedUser(user: SupabaseUser) {
  if (!user.email) return null;

  const email = normalizeEmail(user.email);
  const configuredAdminEmail = getPrimaryAdminEmail();
  let adminEmail = configuredAdminEmail;
  let existingById: { id: string; role: Role } | null = null;
  let existingByEmail: { id: string; role: Role } | null = null;

  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: {
        adminEmail: true,
      },
    });

    adminEmail = normalizeEmail(settings?.adminEmail || configuredAdminEmail);
    existingById = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true },
    });

    existingByEmail = existingById
      ? null
      : await prisma.user.findUnique({
          where: { email },
          select: { id: true, role: true },
        });
  } catch (error) {
    if (!isPrismaConnectionError(error) && !isPrismaSchemaMismatchError(error)) {
      throw error;
    }

    const role = (email === normalizeEmail(configuredAdminEmail) ? "ADMIN" : "STUDENT") as Role;
    return buildFallbackProfile(user, email, role);
  }

  const role = (email === adminEmail ? "ADMIN" : existingById?.role || existingByEmail?.role || "STUDENT") as Role;
  const name =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null;
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) || null;
  const onboardingCompletedAt =
    typeof user.user_metadata?.onboarding_completed_at === "string"
      ? new Date(user.user_metadata.onboarding_completed_at)
      : null;
  const onboardingRecommendations = Array.isArray(user.user_metadata?.onboarding_recommendations)
    ? user.user_metadata.onboarding_recommendations.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  const quizAnswers =
    user.user_metadata?.onboarding_answers &&
    typeof user.user_metadata.onboarding_answers === "object" &&
    !Array.isArray(user.user_metadata.onboarding_answers)
      ? user.user_metadata.onboarding_answers
      : undefined;

  async function updateUserDefensively(
    userId: string,
    referralCode?: string | null
  ) {
    const safeData = {
      email,
      name,
      avatarUrl,
      role,
      ...(referralCode ? {} : { referralCode: await getUniqueReferralCode() }),
    };

    try {
      return await prisma.user.update({
        where: { id: userId },
        data: {
          ...safeData,
          onboardingCompleted: Boolean(onboardingCompletedAt),
          onboardingCompletedAt,
          onboardingRecommendations: toRecommendationField(onboardingRecommendations),
          quizAnswers: toJsonb(quizAnswers),
        },
      });
    } catch (error) {
      if (isRecommendationSerializationError(error)) {
        return prisma.user.update({
          where: { id: userId },
          data: {
            ...safeData,
            onboardingCompleted: Boolean(onboardingCompletedAt),
            onboardingCompletedAt,
            quizAnswers: toJsonb(quizAnswers),
          },
        });
      }

      if (isPrismaConnectionError(error)) {
        return buildFallbackProfile(user, email, role);
      }

      if (isPrismaSchemaMismatchError(error)) {
        return prisma.user.update({
          where: { id: userId },
          data: safeData,
          select: safeUserSelect,
        });
      }

      throw error;
    }
  }

  async function createUserDefensively() {
    const safeData = {
      id: user.id,
      email,
      name,
      avatarUrl,
      role,
      referralCode: await getUniqueReferralCode(),
    };

    try {
      return await prisma.user.create({
        data: {
          ...safeData,
          onboardingCompleted: Boolean(onboardingCompletedAt),
          onboardingCompletedAt,
          onboardingRecommendations: toRecommendationField(onboardingRecommendations),
          quizAnswers: toJsonb(quizAnswers),
        },
      });
    } catch (error) {
      if (isRecommendationSerializationError(error)) {
        return prisma.user.create({
          data: {
            ...safeData,
            onboardingCompleted: Boolean(onboardingCompletedAt),
            onboardingCompletedAt,
            quizAnswers: toJsonb(quizAnswers),
          },
        });
      }

      if (isPrismaConnectionError(error)) {
        return buildFallbackProfile(user, email, role);
      }

      if (isPrismaSchemaMismatchError(error)) {
        return prisma.user.create({
          data: safeData,
          select: safeUserSelect,
        });
      }

      throw error;
    }
  }

  async function getExistingReferralCodeOrNull(userId: string) {
    try {
      return (
        await prisma.user.findUnique({
          where: { id: userId },
          select: { referralCode: true },
        })
      )?.referralCode;
    } catch (error) {
      if (isPrismaConnectionError(error) || isPrismaSchemaMismatchError(error)) {
        return null;
      }

      throw error;
    }
  }

  if (getSupabaseAuthRole(user) !== role) {
    await syncSupabaseAuthRole({
      authUserId: user.id,
      email,
      role,
    }).catch((error) => {
      console.warn("[auth.sync] Unable to update Supabase auth metadata for the current user.", error);
    });
  }

  if (hasBulkySupabaseUserMetadata(user.user_metadata)) {
    await sanitizeSupabaseAuthMetadata({
      authUserId: user.id,
      email,
      role,
      onboardingCompletedAt: onboardingCompletedAt?.toISOString() ?? null,
    }).catch((error) => {
      console.warn("[auth.sync] Unable to trim bulky Supabase auth metadata.", error);
    });
  }

  if (existingById) {
    const referralCode = await getExistingReferralCodeOrNull(existingById.id);
    const updatedUser = await updateUserDefensively(existingById.id, referralCode);
    await ensureEmailPreferenceForUser(existingById.id);
    return updatedUser;
  }

  if (existingByEmail) {
    const referralCode = await getExistingReferralCodeOrNull(existingByEmail.id);
    const updatedUser = await updateUserDefensively(existingByEmail.id, referralCode);
    await ensureEmailPreferenceForUser(existingByEmail.id);
    return updatedUser;
  }

  const createdUser = await createUserDefensively();
  await ensureEmailPreferenceForUser(createdUser.id);
  void sendWelcomeEmail({
    userId: createdUser.id,
    email: createdUser.email,
    name: createdUser.name,
  }).catch((error) => {
    console.warn("[auth.sync] Unable to send welcome email.", error);
  });

  return createdUser;
}

