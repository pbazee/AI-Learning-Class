import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/admin/users-manager";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const joinedFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminUsersPage() {
  const users = await (async () => {
    try {
      return await prisma.user.findMany({
        include: {
          enrollments: {
            select: { id: true },
          },
          subscriptions: {
            where: { status: "ACTIVE" },
            select: { id: true },
          },
          orders: {
            where: { status: "COMPLETED" },
            select: { totalAmount: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error(
        "[database] admin users query failed. Returning a safe fallback while the database catches up.",
        error
      );
      return [];
    }
  })();

  return (
    <UsersManager
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.country,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        enrollmentsCount: user.enrollments.length,
        activeSubscriptions: user.subscriptions.length,
        totalSpent: user.orders.reduce((sum, order) => sum + order.totalAmount, 0),
        joinedAt: joinedFormatter.format(user.createdAt),
      }))}
    />
  );
}
