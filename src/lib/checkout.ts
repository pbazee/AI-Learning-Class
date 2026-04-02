import "server-only";

import type { Coupon, User } from "@prisma/client";
import type { NextRequest } from "next/server";
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
  kind: "course" | "plan";
};

export type CheckoutQuote = {
  items: CheckoutLineItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  appliedCouponCode: string | null;
  appliedCouponDescription: string | null;
  planSlug: string | null;
};

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

function applyCouponDiscount(subtotal: number, coupon: Coupon | null) {
  if (!coupon || subtotal <= 0) {
    return 0;
  }

  const rawDiscount =
    coupon.discountType === "PERCENTAGE"
      ? subtotal * (coupon.value / 100)
      : coupon.value;

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

async function getManagedPlanItem(planSlug: string): Promise<CheckoutLineItem | null> {
  await ensureSubscriptionPlansTable();
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { slug: planSlug },
    select: {
      name: true,
      price: true,
      isActive: true,
    },
  });

  if (!plan || !plan.isActive) {
    return null;
  }

  return {
    kind: "plan",
    title: `${plan.name} Plan`,
    price: plan.price,
  };
}

function sanitizeCartItems(items: CheckoutItemInput[]) {
  return items
    .filter((item) => item && typeof item.title === "string" && Number.isFinite(item.price))
    .map<CheckoutLineItem>((item) => ({
      kind: "course",
      courseId: item.courseId,
      title: item.title,
      price: roundCurrencyAmount(item.price),
      thumbnailUrl: item.thumbnailUrl,
    }));
}

export async function buildCheckoutQuote({
  request,
  items,
  planSlug,
  user,
}: {
  request: NextRequest;
  items?: CheckoutItemInput[];
  planSlug?: string | null;
  user?: Pick<User, "earnedDiscountCode"> | null;
}): Promise<CheckoutQuote> {
  const normalizedPlanSlug = planSlug?.trim().toLowerCase() || null;
  const planItem = normalizedPlanSlug ? await getManagedPlanItem(normalizedPlanSlug) : null;
  const lineItems = planItem ? [planItem] : sanitizeCartItems(items ?? []);
  const subtotal = roundCurrencyAmount(lineItems.reduce((sum, item) => sum + item.price, 0));
  const coupon = await resolveActiveReferralCoupon(request, user);
  const discountAmount = applyCouponDiscount(subtotal, coupon);
  const total = roundCurrencyAmount(subtotal - discountAmount);

  return {
    items: lineItems,
    subtotal,
    discountAmount,
    total,
    appliedCouponCode: coupon?.code ?? null,
    appliedCouponDescription: coupon?.description ?? null,
    planSlug: planItem ? normalizedPlanSlug : null,
  };
}
