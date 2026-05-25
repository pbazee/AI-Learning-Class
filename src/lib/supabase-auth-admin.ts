import "server-only";

import type { Role } from "@prisma/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { normalizeEmail } from "@/lib/admin-email";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type SyncSupabaseAuthRoleInput = {
  authUserId?: string | null;
  email?: string | null;
  role: Role;
};

type ResolveSupabaseAuthUserInput = {
  authUserId?: string | null;
  email?: string | null;
};

type SyncSupabaseAuthRoleResult = {
  status: "updated" | "unchanged" | "not_found";
  authUserId?: string;
};

const ESSENTIAL_USER_METADATA_KEYS = [
  "avatar_url",
  "full_name",
  "name",
  "onboarding_completed_at",
  "role",
] as const;

type EssentialUserMetadataKey = (typeof ESSENTIAL_USER_METADATA_KEYS)[number];

export function getSupabaseAuthRole(
  user: Pick<SupabaseUser, "app_metadata" | "user_metadata"> | null | undefined
) {
  if (!user) {
    return null;
  }

  if (typeof user.app_metadata?.role === "string") {
    return user.app_metadata.role;
  }

  if (typeof user.user_metadata?.role === "string") {
    return user.user_metadata.role;
  }

  return null;
}

function pickStringValue(
  metadata: Record<string, unknown>,
  key: EssentialUserMetadataKey
) {
  const value = metadata[key];

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (key === "onboarding_completed_at" && value === null) {
    return null;
  }

  return undefined;
}

export function sanitizeSupabaseUserMetadata(
  metadata: unknown,
  overrides?: Partial<Record<EssentialUserMetadataKey, string | null | undefined>>
) {
  const source =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  const nextMetadata: Record<string, string | null> = {};

  for (const key of ESSENTIAL_USER_METADATA_KEYS) {
    const overriddenValue = overrides?.[key];

    if (overriddenValue === null) {
      nextMetadata[key] = null;
      continue;
    }

    if (typeof overriddenValue === "string" && overriddenValue.trim()) {
      nextMetadata[key] = overriddenValue;
      continue;
    }

    const sourceValue = pickStringValue(source, key);

    if (sourceValue !== undefined) {
      nextMetadata[key] = sourceValue;
    }
  }

  return nextMetadata;
}

export function hasBulkySupabaseUserMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }

  const record = metadata as Record<string, unknown>;

  return (
    "onboarding_answers" in record ||
    "onboarding_recommendations" in record ||
    Object.keys(record).some(
      (key) =>
        !ESSENTIAL_USER_METADATA_KEYS.includes(key as EssentialUserMetadataKey)
    )
  );
}

async function findSupabaseAuthUserByEmail(email: string) {
  const supabase = getSupabaseAdminClient();
  const normalizedEmail = normalizeEmail(email);
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const match = data.users.find(
      (candidate) => normalizeEmail(candidate.email) === normalizedEmail
    );

    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function resolveSupabaseAuthUser(
  input: ResolveSupabaseAuthUserInput
) {
  const supabase = getSupabaseAdminClient();

  if (input.authUserId) {
    const { data, error } = await supabase.auth.admin.getUserById(input.authUserId);

    if (!error && data.user) {
      return data.user;
    }
  }

  if (!input.email) {
    return null;
  }

  return findSupabaseAuthUserByEmail(input.email);
}

export async function syncSupabaseAuthRole(
  input: SyncSupabaseAuthRoleInput
): Promise<SyncSupabaseAuthRoleResult> {
  const authUser = await resolveSupabaseAuthUser(input);

  if (!authUser) {
    return { status: "not_found" };
  }

  if (getSupabaseAuthRole(authUser) === input.role) {
    return { status: "unchanged", authUserId: authUser.id };
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
    app_metadata: {
      role: input.role,
    },
    user_metadata: sanitizeSupabaseUserMetadata(authUser.user_metadata, {
      role: input.role,
    }),
  });

  if (error) {
    throw error;
  }

  return { status: "updated", authUserId: authUser.id };
}

export async function sanitizeSupabaseAuthMetadata(input: {
  authUserId?: string | null;
  email?: string | null;
  role?: Role | string | null;
  onboardingCompletedAt?: string | null;
  avatarUrl?: string | null;
}) {
  const authUser = await resolveSupabaseAuthUser(input);

  if (!authUser) {
    return { status: "not_found" as const };
  }

  const roleOverride =
    typeof input.role === "string" && input.role.trim() ? input.role : undefined;
  const nextUserMetadata = sanitizeSupabaseUserMetadata(authUser.user_metadata, {
    role: roleOverride,
    onboarding_completed_at: input.onboardingCompletedAt,
    avatar_url: input.avatarUrl,
  });
  const nextAppMetadata =
    roleOverride || typeof authUser.app_metadata?.role === "string"
      ? { role: roleOverride ?? authUser.app_metadata.role }
      : {};

  const alreadySanitized =
    !hasBulkySupabaseUserMetadata(authUser.user_metadata) &&
    JSON.stringify(authUser.user_metadata ?? {}) === JSON.stringify(nextUserMetadata) &&
    JSON.stringify(authUser.app_metadata ?? {}) === JSON.stringify(nextAppMetadata);

  if (alreadySanitized) {
    return { status: "unchanged" as const, authUserId: authUser.id };
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
    app_metadata: nextAppMetadata,
    user_metadata: nextUserMetadata,
  });

  if (error) {
    throw error;
  }

  return { status: "updated" as const, authUserId: authUser.id };
}
