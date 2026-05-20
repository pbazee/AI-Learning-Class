import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getCurrentUserProfile();

    if (!user?.email) {
      return NextResponse.json({ error: "Please sign in to manage your messages." }, { status: 401 });
    }

    const { messageId } = await params;
    const message = await prisma.contactMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    if (message.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "You can only delete your own messages." }, { status: 403 });
    }

    await prisma.contactMessage.delete({
      where: { id: messageId },
    });

    return NextResponse.json({
      success: true,
      message: "Message deleted successfully.",
    });
  } catch (error) {
    console.error("[contact] Unable to delete message.", error);
    return NextResponse.json(
      { error: "Unable to delete this message right now." },
      { status: 500 }
    );
  }
}
