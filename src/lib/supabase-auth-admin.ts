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

type SyncSupabaseAuthRoleResult = {
  status: "updated" | "unchanged" | "not_found";
  authUserId?: string;
};

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
  input: SyncSupabaseAuthRoleInput
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
      ...(authUser.app_metadata ?? {}),
      role: input.role,
    },
    user_metadata: {
      ...(authUser.user_metadata ?? {}),
      role: input.role,
    },
  });

  if (error) {
    throw error;
  }

  return { status: "updated", authUserId: authUser.id };
}
