import { NextRequest, NextResponse } from "next/server";
import { subscribeEmailToNewsletter } from "@/lib/newsletter";

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();
    if (typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    await subscribeEmailToNewsletter({ email, name });

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
