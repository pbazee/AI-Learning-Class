import { MessagesManager } from "@/components/admin/messages-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminMessagesPage() {
  const messages = await (async () => {
    try {
      return await prisma.contactMessage.findMany({
        orderBy: [{ createdAt: "desc" }],
        include: {
          replies: {
            orderBy: [{ createdAt: "asc" }],
          },
        },
      });
    } catch (error) {
      console.error(
        "[database] admin messages query failed. Returning a safe fallback while the database catches up.",
        error
      );
      return [];
    }
  })();

  return (
    <MessagesManager
      messages={messages.map((message) => ({
        id: message.id,
        name: message.name,
        email: message.email,
        subject: message.subject,
        message: message.message,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        replies: message.replies.map((reply) => ({
          id: reply.id,
          senderName: reply.senderName ?? undefined,
          senderEmail: reply.senderEmail ?? undefined,
          body: reply.body,
          isAdmin: reply.isAdmin,
          createdAt: reply.createdAt.toISOString(),
        })),
      }))}
    />
  );
}
