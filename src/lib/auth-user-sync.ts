import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "./prisma";
import { getPrimaryAdminEmail, normalizeEmail } from "./admin-email";

export async function syncAuthenticatedUser(user: SupabaseUser) {
  if (!user.email) return null;

  const email = normalizeEmail(user.email);
  const configuredAdminEmail = getPrimaryAdminEmail();

  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {
      adminEmail: configuredAdminEmail,
    },
    create: {
      id: "singleton",
      siteName: "AI Learning Class",
      adminEmail: configuredAdminEmail,
    },
    select: {
      adminEmail: true,
    },
  });

  const adminEmail = normalizeEmail(settings.adminEmail || configuredAdminEmail);
  const existingById = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });

  const existingByEmail = existingById
    ? null
    : await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });

  const role = email === adminEmail ? "ADMIN" : existingById?.role || existingByEmail?.role || "STUDENT";
  const name =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null;
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) || null;

  if (existingById) {
    return prisma.user.update({
      where: { id: existingById.id },
      data: {
        email,
        name,
        avatarUrl,
        role,
      },
    });
  }

  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        name,
        avatarUrl,
        role,
      },
    });
  }

  return prisma.user.create({
    data: {
      id: user.id,
      email,
      name,
      avatarUrl,
      role,
    },
  });
}
