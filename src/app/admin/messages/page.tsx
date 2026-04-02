import { MessagesManager } from "@/components/admin/messages-manager";
import { prisma } from "@/lib/prisma";

export default async function AdminMessagesPage() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      replies: {
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });

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
