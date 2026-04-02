import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyAdminOfContactMessage } from "@/lib/contact-notifications";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const contactMessageSchema = z.object({
  name: z.string().trim().min(2, "Your name is required."),
  email: z.string().trim().email("A valid email address is required."),
  subject: z.string().trim().min(3, "A short subject is required."),
  message: z.string().trim().min(10, "Please include a detailed message."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const values = contactMessageSchema.parse(body);

    const savedMessage = await prisma.contactMessage.create({
      data: {
        name: values.name,
        email: values.email.toLowerCase(),
        subject: values.subject,
        message: values.message,
        status: "UNREAD",
      },
    });

    void notifyAdminOfContactMessage({
      name: savedMessage.name,
      email: savedMessage.email,
      subject: savedMessage.subject,
      message: savedMessage.message,
      createdAt: savedMessage.createdAt,
    });

    return NextResponse.json({
      success: true,
      message: "Your message has been sent. Our team will get back to you soon.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Please review the form and try again." },
        { status: 400 }
      );
    }

    console.error("[contact] Unable to save message.", error);
    return NextResponse.json(
      { error: "Unable to send your message right now. Please try again shortly." },
      { status: 500 }
    );
  }
}
