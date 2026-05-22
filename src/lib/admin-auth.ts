import { prisma } from "@/lib/prisma";
import { getPrimaryAdminEmail, normalizeEmail } from "@/lib/admin-email";
import { createServerClient } from "@/lib/supabase-server";

type AdminCapableSupabase = Awaited<ReturnType<typeof createServerClient>>;

function getMetadataRole(metadata: unknown) {
  if (metadata && typeof metadata === "object" && "role" in metadata) {
    const role = (metadata as { role?: unknown }).role;
    return typeof role === "string" ? role : null;
  }

  return null;
}

function getAuthRole(
  user:
    | {
        email?: string | null;
        app_metadata?: unknown;
        user_metadata?: unknown;
      }
    | null
    | undefined
) {
  return getMetadataRole(user?.app_metadata) ?? getMetadataRole(user?.user_metadata);
}

function hasAdminRole(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "admin";
}

export async function isAdmin(supabase?: AdminCapableSupabase) {
  const client = supabase ?? (await createServerClient());
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return false;
  }

  const normalizedUserEmail = normalizeEmail(user.email);

  if (
    normalizedUserEmail &&
    (normalizedUserEmail === getPrimaryAdminEmail() || hasAdminRole(getAuthRole(user)))
  ) {
    return true;
  }

  if (!normalizedUserEmail) {
    return false;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: normalizedUserEmail },
    select: { role: true },
  });

  return hasAdminRole(dbUser?.role);
}
