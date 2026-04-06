import "server-only";

import { Prisma, type EnrollmentStatus } from "@prisma/client";
import {
  revokeCatalogEntitlements,
  upsertManagedSubscriptionEntitlement,
} from "@/lib/access-control";
import type { CheckoutGateway, CheckoutQuote } from "@/lib/checkout";
import { syncCourseEnrollmentCounts } from "@/lib/course-metrics";
import { EntitlementSource } from "@/lib/domain-constants";
import { DEFAULT_AFFILIATE_PROGRAM } from "@/lib/affiliate-program";
import { evaluateAffiliateFraud } from "@/lib/growth-utils";
import { recordUserCourseOwnership } from "@/lib/learner-records";
import { prisma } from "@/lib/prisma";
import {
  ensureOwnerTeamWorkspace,
  syncWorkspaceMemberAccessWindow,
} from "@/lib/team-workspace";

type TransactionClient = Prisma.TransactionClient;

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
  planSlug: string,
  options?: {
    stripeSubscriptionId?: string | null;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    billingCycle?: string;
  }
) {
  const plan = await transaction.subscriptionPlan.findUnique({
    where: { slug: planSlug },
    select: {
      id: true,
      slug: true,
      isActive: true,
    },
  });

  if (!plan || !plan.isActive) {
    throw new Error("The selected plan is no longer available.");
  }

  const now = new Date();
  const currentPeriodStart = options?.currentPeriodStart ?? now;
  const currentPeriodEnd = options?.currentPeriodEnd ?? addMonths(currentPeriodStart, 1);
  const billingCycle = options?.billingCycle ?? "monthly";
  const stripeSubscriptionId = normalizeOptionalValue(options?.stripeSubscriptionId);

  const existingSubscription = stripeSubscriptionId
    ? await transaction.userSubscription.findFirst({
        where: {
          stripeSubscriptionId,
        },
        select: {
          id: true,
        },
      })
    : await transaction.userSubscription.findFirst({
        where: {
          userId,
          planId: plan.id,
          status: { in: ["ACTIVE", "TRIALING"] },
          currentPeriodEnd: { gte: now },
        },
        orderBy: { currentPeriodEnd: "desc" },
        select: {
          id: true,
        },
      });

  await transaction.userSubscription.updateMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
      ...(existingSubscription ? { id: { not: existingSubscription.id } } : {}),
    },
    data: {
      status: "CANCELLED",
    },
  });

  const subscription = existingSubscription
    ? await transaction.userSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: "ACTIVE",
          billingCycle,
          stripeSubscriptionId,
          currentPeriodStart,
          currentPeriodEnd,
        },
        select: { id: true },
      })
    : await transaction.userSubscription.create({
        data: {
          userId,
          planId: plan.id,
          status: "ACTIVE",
          billingCycle,
          stripeSubscriptionId,
          currentPeriodStart,
          currentPeriodEnd,
        },
        select: { id: true },
      });

  let teamWorkspaceId: string | null = null;

  if (plan.slug === "teams") {
    const workspace = await ensureOwnerTeamWorkspace(transaction, userId, "AI Learning Class Team");
    teamWorkspaceId = workspace.id;
    await syncWorkspaceMemberAccessWindow(transaction, workspace.id, currentPeriodEnd);
  }

  await upsertManagedSubscriptionEntitlement(transaction, {
    userId,
    planSlug,
    stripeSubscriptionId,
    teamWorkspaceId,
    startsAt: currentPeriodStart,
    endsAt: currentPeriodEnd,
  });

  return {
    subscriptionId: subscription.id,
    teamWorkspaceId,
  };
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
        currency: quote.currency,
      },
    ];
  });

  return prisma.order.create({
    data: {
      userId,
      status: "PENDING",
      totalAmount: quote.total,
      currency: quote.currency,
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
  customerId,
  gateway,
  orderId,
  planSlug,
  providerReference,
  receiptUrl,
  stripeSubscriptionId,
  currentPeriodStart,
  currentPeriodEnd,
  billingCycle,
}: {
  gateway: CheckoutGateway;
  orderId?: string | null;
  providerReference: string;
  planSlug?: string | null;
  receiptUrl?: string | null;
  couponCode?: string | null;
  affiliateCode?: string | null;
  customerEmail?: string | null;
  customerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  billingCycle?: string | null;
}) {
  const normalizedOrderId = normalizeOptionalValue(orderId);
  const normalizedPlanSlug = normalizeOptionalValue(planSlug);
  const normalizedReceiptUrl = normalizeOptionalValue(receiptUrl);
  const normalizedCustomerEmail = normalizeOptionalValue(customerEmail);
  const normalizedCustomerId = normalizeOptionalValue(customerId);
  const normalizedStripeSubscriptionId = normalizeOptionalValue(stripeSubscriptionId);

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
      await recordUserCourseOwnership(
        order.userId,
        purchasedCourseIds,
        {
          accessSource: "purchase",
          lifetimeAccess: true,
          ownedAt: new Date(),
        },
        transaction
      );
      await syncCourseEnrollmentCounts(purchasedCourseIds, transaction);
    }

    const subscriptionId = normalizedPlanSlug
      ? (
          await activatePlanAccess(transaction, order.userId, normalizedPlanSlug, {
            stripeSubscriptionId: normalizedStripeSubscriptionId,
            currentPeriodStart: currentPeriodStart ?? undefined,
            currentPeriodEnd: currentPeriodEnd ?? undefined,
            billingCycle: billingCycle ?? undefined,
          })
        ).subscriptionId
      : null;

    if (normalizedCustomerId) {
      await transaction.user.updateMany({
        where: {
          id: order.userId,
          OR: [{ stripeCustomerId: null }, { stripeCustomerId: { not: normalizedCustomerId } }],
        },
        data: {
          stripeCustomerId: normalizedCustomerId,
        },
      });
    }

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

export async function syncManagedStripeSubscription({
  stripeSubscriptionId,
  customerId,
  status,
  currentPeriodStart,
  currentPeriodEnd,
  billingCycle,
}: {
  stripeSubscriptionId: string;
  customerId?: string | null;
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELLED";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  billingCycle: string;
}) {
  const normalizedStripeSubscriptionId = normalizeOptionalValue(stripeSubscriptionId);

  if (!normalizedStripeSubscriptionId) {
    throw new Error("Missing Stripe subscription identifier.");
  }

  return prisma.$transaction(async (transaction) => {
    const subscription = await transaction.userSubscription.findFirst({
      where: {
        stripeSubscriptionId: normalizedStripeSubscriptionId,
      },
      include: {
        plan: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!subscription) {
      return null;
    }

    await transaction.userSubscription.update({
      where: { id: subscription.id },
      data: {
        status,
        billingCycle,
        currentPeriodStart,
        currentPeriodEnd,
      },
    });

    if (customerId) {
      await transaction.user.updateMany({
        where: {
          id: subscription.userId,
          OR: [{ stripeCustomerId: null }, { stripeCustomerId: { not: customerId } }],
        },
        data: {
          stripeCustomerId: customerId,
        },
      });
    }

    if (status === "ACTIVE" || status === "TRIALING") {
      let teamWorkspaceId: string | null = null;

      if (subscription.plan.slug === "teams") {
        const workspace = await ensureOwnerTeamWorkspace(
          transaction,
          subscription.userId,
          "AI Learning Class Team"
        );
        teamWorkspaceId = workspace.id;
        await syncWorkspaceMemberAccessWindow(transaction, workspace.id, currentPeriodEnd);
      }

      await upsertManagedSubscriptionEntitlement(transaction, {
        userId: subscription.userId,
        planSlug: subscription.plan.slug,
        stripeSubscriptionId: normalizedStripeSubscriptionId,
        teamWorkspaceId,
        startsAt: currentPeriodStart,
        endsAt: currentPeriodEnd,
      });

      return subscription.id;
    }

    await transaction.userEntitlement.updateMany({
      where: {
        userId: subscription.userId,
        stripeSubscriptionId: normalizedStripeSubscriptionId,
        source: "SUBSCRIPTION",
        status: "ACTIVE",
      },
      data: {
        status: "CANCELLED",
        endsAt: currentPeriodEnd,
      },
    });

    if (subscription.plan.slug === "teams") {
      const workspace = await transaction.teamWorkspace.findFirst({
        where: { ownerUserId: subscription.userId },
        select: { id: true },
      });

      if (workspace) {
        await syncWorkspaceMemberAccessWindow(transaction, workspace.id, null);
      }
    }

    await revokeCatalogEntitlements(transaction, {
      userId: subscription.userId,
      source: EntitlementSource.SUBSCRIPTION,
      at: currentPeriodEnd,
    });

    return subscription.id;
  });
}
