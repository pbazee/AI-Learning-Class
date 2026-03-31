import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "./prisma";
import { getPrimaryAdminEmail, normalizeEmail } from "./admin-email";

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
    const referralCode = (await prisma.user.findUnique({
      where: { id: existingById.id },
      select: { referralCode: true },
    }))?.referralCode;

    return prisma.user.update({
      where: { id: existingById.id },
      data: {
        email,
        name,
        avatarUrl,
        role,
        ...(referralCode ? {} : { referralCode: await getUniqueReferralCode() }),
      },
    });
  }

  if (existingByEmail) {
    const referralCode = (await prisma.user.findUnique({
      where: { id: existingByEmail.id },
      select: { referralCode: true },
    }))?.referralCode;

    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        name,
        avatarUrl,
        role,
        ...(referralCode ? {} : { referralCode: await getUniqueReferralCode() }),
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
      referralCode: await getUniqueReferralCode(),
    },
  });
}
