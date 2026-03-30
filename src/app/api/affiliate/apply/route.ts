import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function generateCode(): string {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const existing = await prisma.affiliate.findUnique({ where: { userId: dbUser.id } });
    if (existing) {
      return NextResponse.json({ error: "Already applied", affiliate: existing }, { status: 400 });
    }

    // Generate a unique code
    let affiliateCode = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const clash = await prisma.affiliate.findUnique({ where: { affiliateCode } });
      if (!clash) break;
      affiliateCode = generateCode();
      attempts++;
    }

    const affiliate = await prisma.affiliate.create({
      data: { userId: dbUser.id, affiliateCode, status: "pending" },
    });

    return NextResponse.json({ success: true, affiliate });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
