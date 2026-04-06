import "server-only";

import type { Coupon, User } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getAccessibleCourseAccessByCourseId } from "@/lib/access-control";
import {
  BASE_CHECKOUT_CURRENCY,
  convertCheckoutAmount,
  normalizeCheckoutCurrency,
  resolveCheckoutCurrency,
  type SupportedCheckoutCurrency,
} from "@/lib/checkout-currency";
import { prisma } from "@/lib/prisma";
import { ensureSubscriptionPlansTable } from "@/lib/subscription-plans";

export type CheckoutGateway = "stripe" | "paypal" | "paystack";

export type CheckoutItemInput = {
  courseId?: string;
  title: string;
  price: number;
  thumbnailUrl?: string;
};

export type CheckoutLineItem = CheckoutItemInput & {
  currency: SupportedCheckoutCurrency;
  kind: "course" | "plan";
};

export type CheckoutQuote = {
  currency: SupportedCheckoutCurrency;
  items: CheckoutLineItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  appliedCouponCode: string | null;
  appliedCouponDescription: string | null;
  planSlug: string | null;
};

export class CheckoutQuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutQuoteError";
  }
}

const REFERRAL_COOKIE_KEYS = [
  "earned_discount_code",
  "discount_code",
  "coupon_code",
  "referral_discount_code",
] as const;

function roundCurrencyAmount(value: number) {
  return Math.max(0, Number(value.toFixed(2)));
}

function isCouponRedeemable(coupon: Coupon) {
  const now = new Date();

  if (!coupon.isActive) {
    return false;
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    return false;
  }

  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return false;
  }

  return true;
}

function applyCouponDiscount(
  subtotal: number,
  coupon: Coupon | null,
  currency: SupportedCheckoutCurrency
) {
  if (!coupon || subtotal <= 0) {
    return 0;
  }

  const rawDiscount =
    coupon.discountType === "PERCENTAGE"
      ? subtotal * (coupon.value / 100)
      : convertCheckoutAmount(coupon.value, BASE_CHECKOUT_CURRENCY, currency);

  return roundCurrencyAmount(Math.min(subtotal, rawDiscount));
}

async function resolveActiveReferralCoupon(request: NextRequest, user?: Pick<User, "earnedDiscountCode"> | null) {
  const candidateCodes = new Set<string>();

  REFERRAL_COOKIE_KEYS.forEach((key) => {
    const value = request.cookies.get(key)?.value?.trim();
    if (value) {
      candidateCodes.add(value);
    }
  });

  if (user?.earnedDiscountCode) {
    candidateCodes.add(user.earnedDiscountCode);
  }

  if (candidateCodes.size === 0) {
    return null;
  }

  const coupons = await prisma.coupon.findMany({
    where: {
      code: {
        in: Array.from(candidateCodes),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return coupons.find(isCouponRedeemable) ?? null;
}

async function resolveManualCoupon(couponCode?: string | null) {
  const normalizedCouponCode = couponCode?.trim().toUpperCase();

  if (!normalizedCouponCode) {
    return null;
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCouponCode },
  });

  if (!coupon) {
    throw new CheckoutQuoteError("That coupon code was not found.");
  }

  if (!isCouponRedeemable(coupon)) {
    throw new CheckoutQuoteError("That coupon code is inactive, expired, or fully redeemed.");
  }

  return coupon;
}

async function getManagedPlanItem(planSlug: string): Promise<CheckoutLineItem | null> {
  await ensureSubscriptionPlansTable();
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { slug: planSlug },
    select: {
      currency: true,
      name: true,
      price: true,
      isActive: true,
    },
  });

  if (!plan || !plan.isActive) {
    return null;
  }

  return {
    currency: normalizeCheckoutCurrency(plan.currency),
    kind: "plan",
    title: `${plan.name} Plan`,
    price: plan.price,
  };
}

async function sanitizeCartItems(items: CheckoutItemInput[], userId?: string | null) {
  const requestedCourseIds = Array.from(
    new Set(
      items
        .map((item) => item.courseId?.trim())
        .filter((courseId): courseId is string => Boolean(courseId))
    )
  );

  if (requestedCourseIds.length === 0) {
    return [] as CheckoutLineItem[];
  }

  const accessibleCourseIds = userId
    ? new Set(
        Array.from(
          (await getAccessibleCourseAccessByCourseId(userId, requestedCourseIds)).keys()
        )
      )
    : new Set<string>();

  const courses = await prisma.course.findMany({
    where: {
      id: { in: requestedCourseIds },
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      isFree: true,
      thumbnailUrl: true,
    },
  });
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const addedCourseIds = new Set<string>();

  return items.flatMap<CheckoutLineItem>((item) => {
    const courseId = item.courseId?.trim();

    if (!courseId || addedCourseIds.has(courseId)) {
      return [];
    }

    const course = courseById.get(courseId);

    if (
      !course ||
      course.isFree ||
      course.price === 0 ||
      accessibleCourseIds.has(courseId)
    ) {
      return [];
    }

    addedCourseIds.add(courseId);

    return [
      {
        currency: normalizeCheckoutCurrency(course.currency),
        kind: "course",
        courseId,
        title: course.title,
        price: roundCurrencyAmount(course.isFree ? 0 : course.price),
        thumbnailUrl: course.thumbnailUrl ?? undefined,
      },
    ];
  });
}

export async function buildCheckoutQuote({
  request,
  items,
  planSlug,
  gateway,
  country,
  couponCode,
  preferredCurrency,
  user,
  userId,
}: {
  request: NextRequest;
  items?: CheckoutItemInput[];
  planSlug?: string | null;
  gateway?: CheckoutGateway | null;
  country?: string | null;
  couponCode?: string | null;
  preferredCurrency?: string | null;
  user?: Pick<User, "earnedDiscountCode"> | null;
  userId?: string | null;
}): Promise<CheckoutQuote> {
  const normalizedPlanSlug = planSlug?.trim().toLowerCase() || null;
  const planItem = normalizedPlanSlug ? await getManagedPlanItem(normalizedPlanSlug) : null;
  const sourceLineItems = planItem ? [planItem] : await sanitizeCartItems(items ?? [], userId);
  const quoteCurrency = resolveCheckoutCurrency({
    gateway,
    country,
    preferredCurrency,
    sourceCurrencies: sourceLineItems.map((item) => item.currency),
  });
  const lineItems = sourceLineItems.map((item) => ({
    ...item,
    currency: quoteCurrency,
    price: convertCheckoutAmount(item.price, item.currency, quoteCurrency),
  }));
  const subtotal = roundCurrencyAmount(lineItems.reduce((sum, item) => sum + item.price, 0));
  const coupon =
    (await resolveManualCoupon(couponCode)) ??
    (await resolveActiveReferralCoupon(request, user));
  const discountAmount = applyCouponDiscount(subtotal, coupon, quoteCurrency);
  const total = roundCurrencyAmount(subtotal - discountAmount);

  return {
    currency: quoteCurrency,
    items: lineItems,
    subtotal,
    discountAmount,
    total,
    appliedCouponCode: coupon?.code ?? null,
    appliedCouponDescription: coupon?.description ?? null,
    planSlug: planItem ? normalizedPlanSlug : null,
  };
}
