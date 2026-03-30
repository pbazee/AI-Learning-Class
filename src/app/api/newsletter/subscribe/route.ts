import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();
    const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";
    const subscriberName = typeof name === "string" ? name.trim() : undefined;

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    await prisma.newsletterSubscriber.upsert({
      where: { email: normalizedEmail },
      update: {
        isActive: true,
        name: subscriberName || undefined,
      },
      create: {
        email: normalizedEmail,
        name: subscriberName || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription confirmed. Check your inbox for the next issue.",
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { error: "Unable to subscribe right now. Please try again shortly." },
      { status: 500 }
    );
  }
}
