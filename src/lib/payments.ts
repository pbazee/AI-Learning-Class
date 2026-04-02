import "server-only";

import { Prisma, type EnrollmentStatus } from "@prisma/client";
import type { CheckoutGateway, CheckoutQuote } from "@/lib/checkout";
import { DEFAULT_AFFILIATE_PROGRAM } from "@/lib/affiliate-program";
import { evaluateAffiliateFraud } from "@/lib/growth-utils";
import { prisma } from "@/lib/prisma";

type TransactionClient = Prisma.TransactionClient;

export const CHECKOUT_CURRENCY = "USD";

function normalizeOptionalValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getActiveEnrollmentStatus(status: EnrollmentStatus) {
  return status === "COMPLETED" ? "COMPLETED" : "ACTIVE";
}

function chooseLaterDate(left?: Date | null, right?: Date | null) {
  if (!left) {
    return right ?? null;
  }

  if (!right) {
    return left;
  }

  return left.getTime() >= right.getTime() ? left : right;
}

export function encodeProviderState({
  affiliateCode,
  couponCode,
  orderId,
  planSlug,
}: {
  orderId: string;
  planSlug?: string | null;
  couponCode?: string | null;
  affiliateCode?: string | null;
}) {
  return Buffer.from(
    JSON.stringify({
      orderId,
      planSlug: normalizeOptionalValue(planSlug),
      couponCode: normalizeOptionalValue(couponCode),
      affiliateCode: normalizeOptionalValue(affiliateCode),
    }),
    "utf8"
  ).toString("base64url");
}

export function decodeProviderState(value?: string | null) {
  const normalizedValue = normalizeOptionalValue(value);

  if (!normalizedValue) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(normalizedValue, "base64url").toString("utf8")
    ) as {
      affiliateCode?: string | null;
      couponCode?: string | null;
      orderId?: string | null;
      planSlug?: string | null;
    };
    const orderId = normalizeOptionalValue(decoded.orderId);

    if (!orderId) {
      return null;
    }

    return {
      orderId,
      planSlug: normalizeOptionalValue(decoded.planSlug),
      couponCode: normalizeOptionalValue(decoded.couponCode),
      affiliateCode: normalizeOptionalValue(decoded.affiliateCode),
    };
  } catch {
    return null;
  }
}

async function grantLifetimeCourseAccess(
  transaction: TransactionClient,
  userId: string,
  courseIds: string[]
) {
  const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)));

  if (uniqueCourseIds.length === 0) {
    return;
  }

  const existingEnrollments = await transaction.enrollment.findMany({
    where: {
      userId,
      courseId: { in: uniqueCourseIds },
    },
    select: {
      courseId: true,
      status: true,
    },
  });
  const existingByCourseId = new Map(
    existingEnrollments.map((enrollment) => [enrollment.courseId, enrollment])
  );

  await Promise.all(
    uniqueCourseIds.map(async (courseId) => {
      const existing = existingByCourseId.get(courseId);

      if (!existing) {
        await transaction.enrollment.create({
          data: {
            userId,
            courseId,
            status: "ACTIVE",
            expiresAt: null,
          },
        });
        return;
      }

      await transaction.enrollment.update({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
        data: {
          status: getActiveEnrollmentStatus(existing.status),
          expiresAt: null,
        },
      });
    })
  );
}

async function grantTimedCourseAccess(
  transaction: TransactionClient,
  userId: string,
  courseIds: string[],
  expiresAt: Date
) {
  const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)));

  if (uniqueCourseIds.length === 0) {
    return;
  }

  const existingEnrollments = await transaction.enrollment.findMany({
    where: {
      userId,
      courseId: { in: uniqueCourseIds },
    },
    select: {
      courseId: true,
      expiresAt: true,
      status: true,
    },
  });
  const existingByCourseId = new Map(
    existingEnrollments.map((enrollment) => [enrollment.courseId, enrollment])
  );

  await Promise.all(
    uniqueCourseIds.map(async (courseId) => {
      const existing = existingByCourseId.get(courseId);

      if (!existing) {
        await transaction.enrollment.create({
          data: {
            userId,
            courseId,
            status: "ACTIVE",
            expiresAt,
          },
        });
        return;
      }

      await transaction.enrollment.update({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
        data: {
          status: getActiveEnrollmentStatus(existing.status),
          expiresAt:
            existing.expiresAt === null
              ? null
              : chooseLaterDate(existing.expiresAt, expiresAt),
        },
      });
    })
  );
}

async function resolvePlanCourseIds(
  transaction: TransactionClient,
  coursesIncluded: string[]
) {
  const normalizedEntries = Array.from(
    new Set(
      coursesIncluded
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );

  if (normalizedEntries.length === 0) {
    return [] as string[];
  }

  if (normalizedEntries.includes("ALL")) {
    const courses = await transaction.course.findMany({
      where: { isPublished: true },
      select: { id: true },
    });

    return courses.map((course) => course.id);
  }

  const includeFree = normalizedEntries.includes("FREE");
  const explicitCourseIds = normalizedEntries.filter((entry) => entry !== "FREE");

  const courses = await transaction.course.findMany({
    where: {
      isPublished: true,
      OR: [
        ...(includeFree ? [{ isFree: true }, { price: 0 }] : []),
        ...(explicitCourseIds.length > 0 ? [{ id: { in: explicitCourseIds } }] : []),
      ],
    },
    select: { id: true },
  });

  return courses.map((course) => course.id);
}

async function activatePlanAccess(
  transaction: TransactionClient,
  userId: string,
  planSlug: string
) {
  const plan = await transaction.subscriptionPlan.findUnique({
    where: { slug: planSlug },
    select: {
      id: true,
      coursesIncluded: true,
      isActive: true,
    },
  });

  if (!plan || !plan.isActive) {
    throw new Error("The selected plan is no longer available.");
  }

  const now = new Date();
  const activeSubscription = await transaction.userSubscription.findFirst({
    where: {
      userId,
      planId: plan.id,
      status: { in: ["ACTIVE", "TRIALING"] },
      currentPeriodEnd: { gte: now },
    },
    orderBy: { currentPeriodEnd: "desc" },
    select: {
      id: true,
      currentPeriodEnd: true,
    },
  });

  const billingAnchor = activeSubscription?.currentPeriodEnd ?? now;
  const currentPeriodEnd = addMonths(billingAnchor, 1);

  const subscription = activeSubscription
    ? await transaction.userSubscription.update({
        where: { id: activeSubscription.id },
        data: {
          status: "ACTIVE",
          currentPeriodEnd,
        },
        select: { id: true },
      })
    : await transaction.userSubscription.create({
        data: {
          userId,
          planId: plan.id,
          status: "ACTIVE",
          billingCycle: "monthly",
          currentPeriodStart: now,
          currentPeriodEnd,
        },
        select: { id: true },
      });

  const coveredCourseIds = await resolvePlanCourseIds(
    transaction,
    plan.coursesIncluded
  );

  await grantTimedCourseAccess(transaction, userId, coveredCourseIds, currentPeriodEnd);

  return subscription.id;
}

async function incrementCouponUsage(
  transaction: TransactionClient,
  couponCode: string | null
) {
  const normalizedCouponCode = normalizeOptionalValue(couponCode);

  if (!normalizedCouponCode) {
    return;
  }

  await transaction.coupon.updateMany({
    where: { code: normalizedCouponCode },
    data: {
      usageCount: {
        increment: 1,
      },
    },
  });
}

async function recordAffiliateConversion(
  transaction: TransactionClient,
  {
    affiliateCode,
    customerEmail,
    providerOrderId,
    totalAmount,
  }: {
    affiliateCode: string | null;
    customerEmail?: string | null;
    providerOrderId: string;
    totalAmount: number;
  }
) {
  const normalizedAffiliateCode = normalizeOptionalValue(affiliateCode);

  if (!normalizedAffiliateCode || totalAmount <= 0) {
    return;
  }

  const affiliate = await transaction.affiliate.findUnique({
    where: { affiliateCode: normalizedAffiliateCode },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!affiliate || affiliate.status !== "active") {
    return;
  }

  const existingConversion = await transaction.affiliateConversion.findFirst({
    where: { orderId: providerOrderId },
    select: { id: true },
  });

  if (existingConversion) {
    return;
  }

  const program =
    (await transaction.affiliateProgram.findFirst()) ?? DEFAULT_AFFILIATE_PROGRAM;
  const rate = program.commissionRate ?? DEFAULT_AFFILIATE_PROGRAM.commissionRate;
  const commission = Number(((totalAmount * rate) / 100).toFixed(2));
  const fraudAssessment = evaluateAffiliateFraud({
    affiliateEmail: affiliate.user.email,
    customerEmail,
    enabled:
      program.fraudDetectionEnabled ??
      DEFAULT_AFFILIATE_PROGRAM.fraudDetectionEnabled,
  });
  const eligibleAt = new Date(
    Date.now() +
      (program.payoutGraceDays ?? DEFAULT_AFFILIATE_PROGRAM.payoutGraceDays) *
        86_400_000
  );
  const creditedAt =
    fraudAssessment.fraudStatus === "clear" ? new Date() : null;

  await transaction.affiliateConversion.create({
    data: {
      affiliateId: affiliate.id,
      orderId: providerOrderId,
      amount: totalAmount,
      commission,
      status:
        fraudAssessment.fraudStatus === "flagged" ? "flagged" : "pending",
      fraudStatus: fraudAssessment.fraudStatus,
      fraudReason: fraudAssessment.fraudReason,
      eligibleAt,
      creditedAt,
    },
  });

  if (creditedAt) {
    await transaction.affiliate.update({
      where: { id: affiliate.id },
      data: {
        totalConversions: { increment: 1 },
        totalEarnings: { increment: commission },
        pendingPayout: { increment: commission },
      },
    });
  }

  await transaction.auditLog.create({
    data: {
      actorId: affiliate.userId,
      action:
        fraudAssessment.fraudStatus === "flagged"
          ? "affiliate_conversion.flagged"
          : "affiliate_conversion.tracked",
      entityType: "AffiliateConversion",
      entityId: providerOrderId,
      summary:
        fraudAssessment.fraudStatus === "flagged"
          ? "Affiliate conversion was flagged for review."
          : "Affiliate conversion was tracked successfully.",
      metadata: {
        affiliateId: affiliate.id,
        amount: totalAmount,
        commission,
        eligibleAt: eligibleAt.toISOString(),
        fraudReason: fraudAssessment.fraudReason,
        orderId: providerOrderId,
      },
    },
  });
}

export async function createPendingCheckoutOrder({
  gateway,
  quote,
  userId,
}: {
  userId: string;
  gateway: CheckoutGateway;
  quote: CheckoutQuote;
}) {
  const courseItems = quote.items.flatMap((item) => {
    if (item.kind !== "course" || !item.courseId) {
      return [];
    }

    return [
      {
        courseId: item.courseId,
        price: item.price,
        currency: CHECKOUT_CURRENCY,
      },
    ];
  });

  return prisma.order.create({
    data: {
      userId,
      status: "PENDING",
      totalAmount: quote.total,
      currency: CHECKOUT_CURRENCY,
      paymentMethod: gateway,
      items:
        courseItems.length > 0
          ? {
              create: courseItems,
            }
          : undefined,
    },
    select: {
      id: true,
    },
  });
}

export async function attachProviderReferenceToOrder({
  orderId,
  providerReference,
}: {
  orderId: string;
  providerReference: string;
}) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentIntentId: providerReference,
    },
  });
}

export async function markCheckoutOrderFailed(orderId: string) {
  await prisma.order.updateMany({
    where: {
      id: orderId,
      status: "PENDING",
    },
    data: {
      status: "FAILED",
    },
  });
}

export async function markCheckoutOrderFailedByProviderReference(
  providerReference: string
) {
  const normalizedProviderReference = normalizeOptionalValue(providerReference);

  if (!normalizedProviderReference) {
    return;
  }

  await prisma.order.updateMany({
    where: {
      paymentIntentId: normalizedProviderReference,
      status: "PENDING",
    },
    data: {
      status: "FAILED",
    },
  });
}

export async function finalizeCheckoutOrder({
  affiliateCode,
  couponCode,
  customerEmail,
  gateway,
  orderId,
  planSlug,
  providerReference,
  receiptUrl,
}: {
  gateway: CheckoutGateway;
  orderId?: string | null;
  providerReference: string;
  planSlug?: string | null;
  receiptUrl?: string | null;
  couponCode?: string | null;
  affiliateCode?: string | null;
  customerEmail?: string | null;
}) {
  const normalizedOrderId = normalizeOptionalValue(orderId);
  const normalizedPlanSlug = normalizeOptionalValue(planSlug);
  const normalizedReceiptUrl = normalizeOptionalValue(receiptUrl);
  const normalizedCustomerEmail = normalizeOptionalValue(customerEmail);

  return prisma.$transaction(async (transaction) => {
    const order = normalizedOrderId
      ? await transaction.order.findUnique({
          where: { id: normalizedOrderId },
          include: {
            items: {
              select: {
                courseId: true,
              },
            },
            user: {
              select: {
                email: true,
              },
            },
          },
        })
      : await transaction.order.findFirst({
          where: { paymentIntentId: providerReference },
          include: {
            items: {
              select: {
                courseId: true,
              },
            },
            user: {
              select: {
                email: true,
              },
            },
          },
        });

    if (!order) {
      throw new Error("Unable to find the checkout order for this payment.");
    }

    if (order.status === "COMPLETED") {
      return {
        alreadyCompleted: true,
        orderId: order.id,
        subscriptionId: null,
      };
    }

    const claimedOrder = await transaction.order.updateMany({
      where: {
        id: order.id,
        status: { in: ["PENDING", "FAILED"] },
      },
      data: {
        status: "COMPLETED",
        paymentMethod: gateway,
        paymentIntentId: providerReference,
        receiptUrl: normalizedReceiptUrl ?? order.receiptUrl ?? null,
      },
    });

    if (claimedOrder.count === 0) {
      return {
        alreadyCompleted: true,
        orderId: order.id,
        subscriptionId: null,
      };
    }

    const purchasedCourseIds = order.items.map((item) => item.courseId);

    if (purchasedCourseIds.length > 0) {
      await grantLifetimeCourseAccess(transaction, order.userId, purchasedCourseIds);
    }

    const subscriptionId = normalizedPlanSlug
      ? await activatePlanAccess(transaction, order.userId, normalizedPlanSlug)
      : null;

    await incrementCouponUsage(transaction, couponCode ?? null);
    await recordAffiliateConversion(transaction, {
      affiliateCode: affiliateCode ?? null,
      customerEmail: normalizedCustomerEmail ?? order.user.email ?? null,
      providerOrderId: providerReference,
      totalAmount: order.totalAmount,
    });

    return {
      alreadyCompleted: false,
      orderId: order.id,
      subscriptionId,
    };
  });
}
