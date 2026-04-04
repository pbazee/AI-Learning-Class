import { NextResponse } from "next/server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import { findCountryCodeByName, getCountryNameFromCode } from "@/lib/countries";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const supportedCurrencies = new Set(["USD", "KES", "GHS", "NGN", "ZAR"]);

function normalizeProfile(profile: Awaited<ReturnType<typeof prisma.user.findUnique>>) {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    bio: profile.bio,
    country: profile.country,
    countryCode: findCountryCodeByName(profile.country) ?? "",
    preferredCurrency: profile.preferredCurrency,
    role: profile.role,
    joinedAt: profile.createdAt.toISOString(),
  };
}

async function getAuthenticatedProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  await syncAuthenticatedUser(user);

  return prisma.user.findUnique({
    where: { id: user.id },
  });
}

export async function GET() {
  try {
    const profile = await getAuthenticatedProfile();

    if (!profile) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    return NextResponse.json({ profile: normalizeProfile(profile) });
  } catch (error) {
    console.error("[account.profile] Unable to load profile.", error);
    return NextResponse.json(
      { error: "Unable to load your profile right now." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await getAuthenticatedProfile();

    if (!profile) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";
    const countryCode =
      typeof body.countryCode === "string"
        ? body.countryCode.trim().toUpperCase()
        : "";
    const preferredCurrency =
      typeof body.preferredCurrency === "string"
        ? body.preferredCurrency.trim().toUpperCase()
        : profile.preferredCurrency;

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json(
        { error: "Display name must be between 2 and 120 characters." },
        { status: 400 }
      );
    }

    if (bio.length > 500) {
      return NextResponse.json(
        { error: "Bio must stay under 500 characters." },
        { status: 400 }
      );
    }

    if (!supportedCurrencies.has(preferredCurrency)) {
      return NextResponse.json(
        { error: "Choose a supported preferred currency." },
        { status: 400 }
      );
    }

    const country = countryCode ? getCountryNameFromCode(countryCode) : null;

    if (countryCode && !country) {
      return NextResponse.json(
        { error: "Choose a valid country." },
        { status: 400 }
      );
    }

    const updatedProfile = await prisma.user.update({
      where: { id: profile.id },
      data: {
        name,
        bio: bio || null,
        country,
        preferredCurrency,
      },
    });

    return NextResponse.json({ profile: normalizeProfile(updatedProfile) });
  } catch (error) {
    console.error("[account.profile] Unable to save profile.", error);
    return NextResponse.json(
      { error: "Unable to save your profile right now." },
      { status: 500 }
    );
  }
}
