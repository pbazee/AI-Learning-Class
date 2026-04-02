import "server-only";

import { Prisma } from "@prisma/client";
import type { SubscriptionPlan } from "@/types";
import { isPrismaConnectionError, logPrismaConnectionEvent, prisma } from "@/lib/prisma";

let subscriptionPlansTableReady: Promise<boolean> | null = null;
let subscriptionPlansTableAvailable = false;

type TablePresenceRow = {
  prisma_table: string | null;
  snake_table: string | null;
};

export function mapSubscriptionPlan(plan: {
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

export async function ensureSubscriptionPlansTable() {
  if (subscriptionPlansTableAvailable) {
    return true;
  }

  if (!subscriptionPlansTableReady) {
    subscriptionPlansTableReady = (async () => {
      try {
        const [presence] = await prisma.$queryRaw<TablePresenceRow[]>(Prisma.sql`
          SELECT
            to_regclass('public."SubscriptionPlan"')::text AS prisma_table,
            to_regclass('public.subscription_plans')::text AS snake_table
        `);

        await prisma.$executeRaw(Prisma.sql`
          CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
            id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
            name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            description TEXT,
            price DOUBLE PRECISION NOT NULL DEFAULT 0,
            "yearlyPrice" DOUBLE PRECISION,
            currency TEXT NOT NULL DEFAULT 'USD',
            features TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
            "coursesIncluded" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
            "isPopular" BOOLEAN NOT NULL DEFAULT FALSE,
            "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
            "stripePriceId" TEXT,
            "stripeYearlyPriceId" TEXT,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        if (!presence?.prisma_table && presence?.snake_table) {
          await prisma.$executeRaw(Prisma.sql`
            INSERT INTO "SubscriptionPlan" (
              id,
              name,
              slug,
              description,
              price,
              "yearlyPrice",
              currency,
              features,
              "coursesIncluded",
              "isPopular",
              "isActive",
              "stripePriceId",
              "stripeYearlyPriceId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              id,
              name,
              slug,
              description,
              price,
              yearly_price,
              currency,
              features,
              courses_included,
              is_popular,
              is_active,
              stripe_price_id,
              stripe_yearly_price_id,
              created_at,
              updated_at
            FROM subscription_plans
            ON CONFLICT (slug) DO NOTHING
          `);
        }

        subscriptionPlansTableAvailable = true;
        return true;
      } catch (error) {
        subscriptionPlansTableAvailable = false;

        if (isPrismaConnectionError(error)) {
          logPrismaConnectionEvent(
            "subscriptionPlansTable",
            "[subscription-plans] Unable to ensure the subscription plans table right now.",
            error,
            "warn"
          );
          return false;
        }

        throw error;
      }
    })().catch((error) => {
      subscriptionPlansTableReady = null;
      throw error;
    });
  }

  const isReady = await subscriptionPlansTableReady;

  if (!isReady) {
    subscriptionPlansTableReady = null;
  }

  return isReady;
}
