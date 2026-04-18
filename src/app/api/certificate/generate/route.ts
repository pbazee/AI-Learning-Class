import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const { userId, courseId, courseTitle, userName } = await req.json();
    const code = `ALC-${courseId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;

    const { prisma } = await import("@/lib/prisma");
    const certificate = await prisma.certificate.create({
      data: {
        userId,
        courseId,
        code,
      },
    });

    await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "certificate",
        to: req.headers.get("x-user-email") || "user@example.com",
        data: {
          name: userName,
          courseTitle,
          certificateCode: code,
        },
      }),
    });

    return NextResponse.json({ success: true, code, id: certificate.id });
  } catch (error: any) {
    console.error("Certificate generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const certificate = await prisma.certificate.findUnique({
    where: { code },
    include: { course: true, user: true },
  });

  if (!certificate) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    code: certificate.code,
    issuedAt: certificate.issuedAt,
    course: certificate.course.title,
    user: certificate.user.name,
  });
}
