import "server-only";

import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@/types";

export const MANAGED_PLAN_SLUGS = ["free", "pro", "teams"] as const;

const PLAN_ORDER = new Map(
  MANAGED_PLAN_SLUGS.map((slug, index) => [slug, index])
);

export const PLATFORM_SUBSCRIPTION_PLANS = [
  {
    slug: "free",
    name: "Free",
    description: "Free Plan - all free courses + certificates",
    price: 0,
    currency: "USD",
    features: [
      "All free courses",
      "Certificates of completion",
      "Mobile and desktop learning access",
    ],
    coursesIncluded: ["FREE"],
    isPopular: false,
    isActive: true,
  },
  {
    slug: "pro",
    name: "Pro",
    description: "Access to ALL courses + priority support + early access",
    price: 79,
    currency: "USD",
    features: [
      "Access to ALL courses",
      "Priority support",
      "Early access to new releases",
    ],
    coursesIncluded: ["ALL"],
    isPopular: true,
    isActive: true,
  },
  {
    slug: "teams",
    name: "Teams",
    description: "Everything in Pro + admin dashboard & progress tracking",
    price: 199,
    currency: "USD",
    features: [
      "Everything in Pro",
      "Admin dashboard with invites",
      "Team progress tracking",
      "Bulk assignments and CSV exports",
    ],
    coursesIncluded: ["ALL"],
    isPopular: false,
    isActive: true,
  },
] as const;

function sortManagedPlans<T extends { slug: string }>(plans: T[]) {
  return [...plans].sort(
    (left, right) =>
      (PLAN_ORDER.get(left.slug as (typeof MANAGED_PLAN_SLUGS)[number]) ?? 999) -
      (PLAN_ORDER.get(right.slug as (typeof MANAGED_PLAN_SLUGS)[number]) ?? 999)
  );
}

export function mapManagedSubscriptionPlan(plan: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  yearlyPrice: number | null;
  currency: string;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
}): SubscriptionPlan {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description ?? undefined,
    price: plan.price,
    yearlyPrice: plan.yearlyPrice ?? undefined,
    currency: plan.currency,
    features: plan.features,
    isPopular: plan.isPopular,
    isActive: plan.isActive,
  };
}

export async function ensurePlatformSubscriptionPlans() {
  await prisma.$transaction(async (transaction) => {
    for (const plan of PLATFORM_SUBSCRIPTION_PLANS) {
      await transaction.subscriptionPlan.upsert({
        where: { slug: plan.slug },
        update: {
          name: plan.name,
          description: plan.description,
          price: plan.price,
          yearlyPrice: null,
          currency: plan.currency,
          features: [...plan.features],
          coursesIncluded: [...plan.coursesIncluded],
          isPopular: plan.isPopular,
          isActive: plan.isActive,
        },
        create: {
          name: plan.name,
          slug: plan.slug,
          description: plan.description,
          price: plan.price,
          yearlyPrice: null,
          currency: plan.currency,
          features: [...plan.features],
          coursesIncluded: [...plan.coursesIncluded],
          isPopular: plan.isPopular,
          isActive: plan.isActive,
        },
      });
    }

    await transaction.subscriptionPlan.updateMany({
      where: {
        slug: {
          notIn: [...MANAGED_PLAN_SLUGS],
        },
      },
      data: {
        isActive: false,
        isPopular: false,
      },
    });
  });

  const plans = await prisma.subscriptionPlan.findMany({
    where: {
      slug: {
        in: [...MANAGED_PLAN_SLUGS],
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return sortManagedPlans(plans);
}
