import { prisma } from "@/lib/prisma";
import { OrdersManager, type AdminOrderRecord, type AdminOrderStatus } from "@/components/admin/orders-manager";

function normalizeOrderStatus(status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"): AdminOrderStatus {
  switch (status) {
    case "COMPLETED":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "REFUNDED":
      return "Refunded";
    default:
      return "Cancelled";
  }
}

function normalizeSubscriptionStatus(status: "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING"): AdminOrderStatus {
  switch (status) {
    case "ACTIVE":
    case "TRIALING":
      return "Paid";
    case "PAST_DUE":
      return "Pending";
    default:
      return "Cancelled";
  }
}

function humanizePaymentMethod(value?: string | null) {
  if (!value) {
    return "Card payment";
  }

  return value
    .split(/[_-\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminOrdersPage() {
  const [orders, subscriptions] = await Promise.all([
    prisma.order.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            country: true,
            enrollments: {
              select: {
                courseId: true,
              },
            },
          },
        },
        items: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userSubscription.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            country: true,
          },
        },
        plan: {
          select: {
            name: true,
            price: true,
            yearlyPrice: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const orderRows: AdminOrderRecord[] = orders.map((order) => {
    const status = normalizeOrderStatus(order.status);
    const courseItems = order.items.map((item) => ({
      courseId: item.courseId,
      title: item.course.title,
      price: item.price,
      hasAccess: order.user.enrollments.some((enrollment) => enrollment.courseId === item.courseId),
    }));

    const statusHistory = [
      {
        label: "Order created",
        timestamp: order.createdAt.toISOString(),
        detail: "Customer completed checkout and the order record was created.",
      },
      {
        label:
          order.status === "COMPLETED"
            ? "Payment captured"
            : order.status === "REFUNDED"
              ? "Refund processed"
              : order.status === "FAILED"
                ? "Order cancelled"
                : "Awaiting payment",
        timestamp: order.updatedAt.toISOString(),
        detail: `Current order status: ${status}. Payment method: ${humanizePaymentMethod(order.paymentMethod)}.`,
      },
    ];

    return {
      id: order.id,
      kind: "course_order",
      sourceStatus: order.status,
      customerName: order.user.name || order.user.email || "Unknown customer",
      customerEmail: order.user.email || "No email provided",
      customerCountry: order.user.country,
      itemSummary: courseItems.map((item) => item.title).join(", ") || "Course purchase",
      itemLabels: courseItems.map((item) => item.title),
      amount: order.totalAmount,
      currency: order.currency,
      status,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      paymentMethod: humanizePaymentMethod(order.paymentMethod),
      paymentReference: order.paymentIntentId,
      receiptUrl: order.receiptUrl,
      courseItems,
      actions: {
        canRefund: order.status === "COMPLETED",
        canGrantAccess: order.status === "COMPLETED" && courseItems.length > 0,
      },
      statusHistory,
    };
  });

  const subscriptionRows: AdminOrderRecord[] = subscriptions.map((subscription) => {
    const amount =
      subscription.billingCycle.toLowerCase() === "yearly"
        ? subscription.plan.yearlyPrice ?? subscription.plan.price
        : subscription.plan.price;
    const status = normalizeSubscriptionStatus(subscription.status);
    const statusHistory = [
      {
        label: "Subscription created",
        timestamp: subscription.createdAt.toISOString(),
        detail: `${subscription.plan.name} was started on ${subscription.billingCycle} billing.`,
      },
      {
        label: "Current billing period",
        timestamp: subscription.currentPeriodStart.toISOString(),
        detail: `Current status: ${status}. Period ends on ${subscription.currentPeriodEnd.toISOString().slice(0, 10)}.`,
      },
    ];

    return {
      id: subscription.id,
      kind: "subscription",
      sourceStatus: subscription.status,
      customerName: subscription.user.name || subscription.user.email || "Unknown customer",
      customerEmail: subscription.user.email || "No email provided",
      customerCountry: subscription.user.country,
      itemSummary: subscription.plan.name,
      itemLabels: [subscription.plan.name],
      amount,
      currency: subscription.plan.currency,
      status,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.currentPeriodStart.toISOString(),
      paymentMethod: `${subscription.billingCycle} subscription`,
      paymentReference: null,
      receiptUrl: null,
      billingCycle: subscription.billingCycle,
      periodStart: subscription.currentPeriodStart.toISOString(),
      periodEnd: subscription.currentPeriodEnd.toISOString(),
      courseItems: [],
      actions: {
        canRefund: false,
        canGrantAccess: false,
      },
      statusHistory,
    };
  });

  const rows = [...orderRows, ...subscriptionRows].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  return <OrdersManager orders={rows} />;
}
