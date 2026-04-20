import "server-only";

import { Prisma } from "@prisma/client";
import { getActiveCatalogEntitlement } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { isPrismaConnectionError, logPrismaConnectionEvent } from "@/lib/prisma-errors";
import { ensureSubscriptionPlansTable } from "@/lib/subscription-plans";

type UserAiUsageRow = {
  request_count: number;
};

type AskAiPlanRecord = {
  slug?: string | null;
  name?: string | null;
  askAiLimit?: number | null;
};

export type AskAiQuota = {
  planName: string;
  limit: number;
  used: number;
  remaining: number;
  monthKey: string;
};

let userAiUsageTableReady: Promise<boolean> | null = null;
let userAiUsageTableAvailable = false;

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getPlanLimit(plan?: AskAiPlanRecord | null) {
  if (typeof plan?.askAiLimit === "number" && Number.isFinite(plan.askAiLimit)) {
    return Math.max(0, Math.round(plan.askAiLimit));
  }

  const normalized = `${plan?.slug ?? ""} ${plan?.name ?? ""}`.trim().toLowerCase();

  if (normalized.includes("team")) {
    return 5_000;
  }

  if (normalized.includes("pro")) {
    return 1_000;
  }

  return 20;
}

function getPlanName(plan?: AskAiPlanRecord | null) {
  return plan?.name?.trim() || "Free";
}

async function ensureUserAiUsageTable() {
  if (userAiUsageTableAvailable) {
    return true;
  }

  if (!userAiUsageTableReady) {
    userAiUsageTableReady = (async () => {
      try {
        await prisma.$executeRaw(Prisma.sql`
          CREATE TABLE IF NOT EXISTS user_ai_usage (
            id BIGSERIAL PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
            month_key TEXT NOT NULL,
            request_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (user_id, month_key)
          )
        `);
        await prisma.$executeRaw(Prisma.sql`
          CREATE INDEX IF NOT EXISTS user_ai_usage_lookup_idx
          ON user_ai_usage (user_id, month_key)
        `);

        userAiUsageTableAvailable = true;
        return true;
      } catch (error) {
        userAiUsageTableAvailable = false;

        if (isPrismaConnectionError(error)) {
          logPrismaConnectionEvent(
            "userAiUsageTable",
            "[ask-ai-usage] Unable to ensure the Ask AI usage table right now.",
            error,
            "warn"
          );
          return false;
        }

        throw error;
      }
    })().catch((error) => {
      userAiUsageTableReady = null;
      throw error;
    });
  }

  const isReady = await userAiUsageTableReady;

  if (!isReady) {
    userAiUsageTableReady = null;
  }

  return isReady;
}

async function resolveUserAskAiPlan(userId: string): Promise<AskAiPlanRecord | null> {
  await ensureSubscriptionPlansTable();

  const entitlement = await getActiveCatalogEntitlement(userId);
  const planSlug = entitlement.planSlug?.trim().toLowerCase() || "free";

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { slug: planSlug },
    select: {
      slug: true,
      name: true,
      askAiLimit: true,
    },
  });

  if (plan) {
    return plan;
  }

  if (planSlug === "free") {
    return {
      slug: "free",
      name: "Free",
      askAiLimit: 20,
    };
  }

  return {
    slug: entitlement.planSlug,
    name: entitlement.planSlug,
    askAiLimit: null,
  };
}

export async function getUserAskAiQuota(userId: string): Promise<AskAiQuota> {
  const usageTableReady = await ensureUserAiUsageTable();
  const monthKey = getCurrentMonthKey();
  const plan = await resolveUserAskAiPlan(userId);
  const limit = getPlanLimit(plan);
  const planName = getPlanName(plan);

  if (!usageTableReady) {
    return {
      planName,
      limit,
      used: 0,
      remaining: limit,
      monthKey,
    };
  }

  try {
    const rows = await prisma.$queryRaw<UserAiUsageRow[]>(Prisma.sql`
      SELECT request_count
      FROM user_ai_usage
      WHERE user_id = ${userId}
        AND month_key = ${monthKey}
      LIMIT 1
    `);

    const used = rows[0]?.request_count ?? 0;

    return {
      planName,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      monthKey,
    };
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      logPrismaConnectionEvent(
        "userAskAiQuota",
        "[ask-ai-usage] Unable to read Ask AI usage right now. Returning a safe quota view.",
        error,
        "warn"
      );
      return {
        planName,
        limit,
        used: 0,
        remaining: limit,
        monthKey,
      };
    }

    throw error;
  }
}

export async function incrementUserAskAiUsage(userId: string, monthKey: string) {
  const usageTableReady = await ensureUserAiUsageTable();

  if (!usageTableReady) {
    return false;
  }

  try {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO user_ai_usage (user_id, month_key, request_count, created_at, updated_at)
      VALUES (${userId}, ${monthKey}, 1, NOW(), NOW())
      ON CONFLICT (user_id, month_key)
      DO UPDATE SET
        request_count = user_ai_usage.request_count + 1,
        updated_at = NOW()
    `);

    return true;
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      logPrismaConnectionEvent(
        "incrementUserAskAiUsage",
        "[ask-ai-usage] Unable to record Ask AI usage right now.",
        error,
        "warn"
      );
      return false;
    }

    throw error;
  }
}

export type CopilotQuota = AskAiQuota;
export const getUserCopilotQuota = getUserAskAiQuota;
export const incrementUserCopilotUsage = incrementUserAskAiUsage;
