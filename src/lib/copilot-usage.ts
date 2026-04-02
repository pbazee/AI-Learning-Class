import "server-only";

import { Prisma } from "@prisma/client";
import { isPrismaConnectionError, logPrismaConnectionEvent, prisma } from "@/lib/prisma";
import { ensureSubscriptionPlansTable } from "@/lib/subscription-plans";

type UserAiUsageRow = {
  request_count: number;
};

export type CopilotQuota = {
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

function getPlanLimit(plan?: { slug?: string | null; name?: string | null } | null) {
  const normalized = `${plan?.slug ?? ""} ${plan?.name ?? ""}`.trim().toLowerCase();

  if (normalized.includes("team")) {
    return 5_000;
  }

  if (normalized.includes("pro")) {
    return 1_000;
  }

  return 20;
}

function getPlanName(plan?: { name?: string | null } | null) {
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
            "[copilot-usage] Unable to ensure the AI usage table right now.",
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

export async function getUserCopilotQuota(userId: string): Promise<CopilotQuota> {
  await ensureSubscriptionPlansTable();
  const usageTableReady = await ensureUserAiUsageTable();
  const monthKey = getCurrentMonthKey();

  const activeSubscription = await prisma.userSubscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      currentPeriodEnd: {
        gte: new Date(),
      },
    },
    orderBy: {
      currentPeriodEnd: "desc",
    },
    include: {
      plan: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  const limit = getPlanLimit(activeSubscription?.plan);
  const planName = getPlanName(activeSubscription?.plan);

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
        "userCopilotQuota",
        "[copilot-usage] Unable to read AI usage right now. Returning a safe quota view.",
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

export async function incrementUserCopilotUsage(userId: string, monthKey: string) {
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
        "incrementUserCopilotUsage",
        "[copilot-usage] Unable to record AI usage right now.",
        error,
        "warn"
      );
      return false;
    }

    throw error;
  }
}
