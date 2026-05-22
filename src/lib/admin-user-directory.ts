import "server-only";

import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  AdminDirectoryFilters,
  AdminDirectoryMode,
  AdminDirectoryResult,
} from "@/lib/admin-user-directory-types";

type SearchParamInput =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | undefined;

const PAGE_SIZE = 20;

function readSearchParam(source: SearchParamInput, key: string) {
  if (!source) {
    return undefined;
  }

  if (source instanceof URLSearchParams) {
    return source.get(key) ?? undefined;
  }

  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

function clampPage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function cleanText(value: string | undefined) {
  return value?.trim() ?? "";
}

function isRoleValue(value: string | undefined): value is Role {
  return value === "STUDENT" || value === "INSTRUCTOR" || value === "ADMIN" || value === "SUPER_ADMIN";
}

function isPlanValue(value: string | undefined): value is "free" | "pro" | "teams" {
  return value === "free" || value === "pro" || value === "teams";
}

function isProgressValue(
  value: string | undefined
): value is "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" {
  return value === "NOT_STARTED" || value === "IN_PROGRESS" || value === "COMPLETED";
}

function getAllowedSort(mode: AdminDirectoryMode, value: string | undefined) {
  const allowed =
    mode === "learners"
      ? ["joined", "revenue", "lastActive", "progress", "name"]
      : ["joined", "revenue", "courses", "name"];

  return value && allowed.includes(value) ? value : "joined";
}

export function parseAdminDirectoryFilters(
  mode: AdminDirectoryMode,
  searchParams?: SearchParamInput
): AdminDirectoryFilters {
  const roleParam = readSearchParam(searchParams, "role");
  const planParam = readSearchParam(searchParams, "plan");
  const progressParam = readSearchParam(searchParams, "progress");

  return {
    page: clampPage(readSearchParam(searchParams, "page")),
    pageSize: PAGE_SIZE,
    search: cleanText(readSearchParam(searchParams, "search")),
    role: mode === "users" && isRoleValue(roleParam) ? roleParam : "all",
    plan: isPlanValue(planParam) ? planParam : "all",
    progress: mode === "learners" && isProgressValue(progressParam) ? progressParam : "all",
    country: cleanText(readSearchParam(searchParams, "country")),
    joinedFrom: cleanText(readSearchParam(searchParams, "from")),
    joinedTo: cleanText(readSearchParam(searchParams, "to")),
    sort: getAllowedSort(mode, readSearchParam(searchParams, "sort")),
  };
}

function buildUserWhere(mode: AdminDirectoryMode, filters: AdminDirectoryFilters) {
  const conditions: Prisma.Sql[] = [];

  if (mode === "learners") {
    conditions.push(Prisma.sql`u.role = 'STUDENT'`);
  } else if (filters.role !== "all") {
    conditions.push(Prisma.sql`u.role = ${filters.role}`);
  }

  if (filters.search) {
    const query = `%${filters.search.toLowerCase()}%`;
    conditions.push(
      Prisma.sql`(lower(coalesce(u.name, '')) LIKE ${query} OR lower(u.email) LIKE ${query})`
    );
  }

  if (filters.country) {
    conditions.push(Prisma.sql`u."country" = ${filters.country}`);
  }

  if (filters.joinedFrom) {
    conditions.push(Prisma.sql`u."createdAt" >= ${new Date(`${filters.joinedFrom}T00:00:00.000Z`)}`);
  }

  if (filters.joinedTo) {
    conditions.push(Prisma.sql`u."createdAt" < ${new Date(`${filters.joinedTo}T23:59:59.999Z`)}`);
  }

  return conditions.length > 0 ? Prisma.join(conditions, " AND ") : Prisma.sql`TRUE`;
}

function buildMetricWhere(mode: AdminDirectoryMode, filters: AdminDirectoryFilters) {
  const conditions: Prisma.Sql[] = [];

  if (filters.plan !== "all") {
    conditions.push(Prisma.sql`lower(coalesce(user_metrics.plan_slug, 'free')) = ${filters.plan}`);
  }

  if (mode === "learners" && filters.progress !== "all") {
    conditions.push(Prisma.sql`user_metrics.progress_status = ${filters.progress}`);
  }

  return conditions.length > 0 ? Prisma.join(conditions, " AND ") : Prisma.sql`TRUE`;
}

function getOrderBy(mode: AdminDirectoryMode, sort: string) {
  switch (sort) {
    case "name":
      return Prisma.sql`lower(coalesce(user_metrics.name, user_metrics.email)) ASC`;
    case "revenue":
      return Prisma.sql`user_metrics.total_spent DESC, user_metrics."createdAt" DESC`;
    case "courses":
      return Prisma.sql`user_metrics.enrollments_count DESC, user_metrics."createdAt" DESC`;
    case "lastActive":
      return Prisma.sql`user_metrics.last_active_at DESC NULLS LAST, user_metrics."createdAt" DESC`;
    case "progress":
      return Prisma.sql`user_metrics.progress_percent DESC, user_metrics.last_active_at DESC NULLS LAST, user_metrics."createdAt" DESC`;
    case "joined":
    default:
      return Prisma.sql`user_metrics."createdAt" DESC`;
  }
}

function buildUserMetricsCte(userWhere: Prisma.Sql) {
  return Prisma.sql`
    WITH user_metrics AS (
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u."country",
        u."avatarUrl",
        u.bio,
        u."createdAt",
        COALESCE(enrollments.enrollments_count, 0) AS enrollments_count,
        COALESCE(subscriptions.active_subscriptions_count, 0) AS active_subscriptions,
        COALESCE(orders.total_spent, 0)::double precision AS total_spent,
        COALESCE(current_plan.plan_slug, 'free') AS plan_slug,
        current_plan.plan_name,
        activity.last_active_at,
        COALESCE(progress.completed_lessons, 0) AS completed_lessons,
        COALESCE(progress.total_lessons, 0) AS total_lessons,
        CASE
          WHEN COALESCE(progress.total_lessons, 0) > 0 THEN ROUND((progress.completed_lessons::numeric / progress.total_lessons::numeric) * 100)::int
          ELSE 0
        END AS progress_percent,
        CASE
          WHEN COALESCE(progress.total_lessons, 0) = 0 OR COALESCE(progress.completed_lessons, 0) = 0 THEN 'NOT_STARTED'
          WHEN progress.completed_lessons >= progress.total_lessons THEN 'COMPLETED'
          ELSE 'IN_PROGRESS'
        END AS progress_status
      FROM "User" u
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS enrollments_count
        FROM "Enrollment" e
        WHERE e."userId" = u.id
      ) enrollments ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS active_subscriptions_count
        FROM "UserSubscription" us
        WHERE us."userId" = u.id
          AND us.status IN ('ACTIVE', 'TRIALING', 'PAST_DUE')
          AND us."currentPeriodEnd" >= NOW()
      ) subscriptions ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(o."totalAmount")::double precision AS total_spent
        FROM "Order" o
        WHERE o."userId" = u.id
          AND o.status = 'COMPLETED'
      ) orders ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          LOWER(sp.slug) AS plan_slug,
          sp.name AS plan_name
        FROM "UserSubscription" us
        JOIN "SubscriptionPlan" sp ON sp.id = us."planId"
        WHERE us."userId" = u.id
          AND us.status IN ('ACTIVE', 'TRIALING', 'PAST_DUE')
          AND us."currentPeriodEnd" >= NOW()
        ORDER BY us."currentPeriodEnd" DESC, us."createdAt" DESC
        LIMIT 1
      ) current_plan ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(lp."updatedAt") AS last_active_at
        FROM "LessonProgress" lp
        WHERE lp."userId" = u.id
      ) activity ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT CASE WHEN lp."isCompleted" = TRUE THEN lp."lessonId" END)::int AS completed_lessons,
          COUNT(DISTINCT l.id)::int AS total_lessons
        FROM "Enrollment" e
        JOIN "Module" m ON m."courseId" = e."courseId"
        JOIN "Lesson" l ON l."moduleId" = m.id
        LEFT JOIN "LessonProgress" lp
          ON lp."userId" = u.id
         AND lp."lessonId" = l.id
         AND lp."isCompleted" = TRUE
        WHERE e."userId" = u.id
      ) progress ON TRUE
      WHERE ${userWhere}
    )
  `;
}

export async function getAdminDirectoryPage(
  mode: AdminDirectoryMode,
  searchParams?: SearchParamInput
): Promise<AdminDirectoryResult> {
  const filters = parseAdminDirectoryFilters(mode, searchParams);
  const userWhere = buildUserWhere(mode, filters);
  const metricWhere = buildMetricWhere(mode, filters);
  const orderBy = getOrderBy(mode, filters.sort);
  const offset = (filters.page - 1) * filters.pageSize;
  const cte = buildUserMetricsCte(userWhere);

  const [rows, countResult, countries] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        id: string;
        name: string | null;
        email: string;
        role: Role;
        country: string | null;
        avatarUrl: string | null;
        bio: string | null;
        enrollments_count: number;
        active_subscriptions: number;
        total_spent: number;
        createdAt: Date;
        plan_slug: string;
        last_active_at: Date | null;
        progress_percent: number;
        progress_status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
      }>
    >(Prisma.sql`
      ${cte}
      SELECT
        user_metrics.id,
        user_metrics.name,
        user_metrics.email,
        user_metrics.role,
        user_metrics."country" AS country,
        user_metrics."avatarUrl" AS "avatarUrl",
        user_metrics.bio,
        user_metrics.enrollments_count,
        user_metrics.active_subscriptions,
        user_metrics.total_spent,
        user_metrics."createdAt",
        user_metrics.plan_slug,
        user_metrics.last_active_at,
        user_metrics.progress_percent,
        user_metrics.progress_status
      FROM user_metrics
      WHERE ${metricWhere}
      ORDER BY ${orderBy}
      LIMIT ${filters.pageSize}
      OFFSET ${offset}
    `),
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      ${cte}
      SELECT COUNT(*)::bigint AS total
      FROM user_metrics
      WHERE ${metricWhere}
    `),
    prisma.user.groupBy({
      by: ["country"],
      where: {
        ...(mode === "learners" ? { role: "STUDENT" } : {}),
        country: { not: null },
      },
      orderBy: { country: "asc" },
    }),
  ]);

  const total = Number(countResult[0]?.total ?? BigInt(0));
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  return {
    mode,
    filters: {
      ...filters,
      page: Math.min(filters.page, pageCount),
    },
    users: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      country: row.country,
      avatarUrl: row.avatarUrl,
      bio: row.bio,
      enrollmentsCount: Number(row.enrollments_count ?? 0),
      activeSubscriptions: Number(row.active_subscriptions ?? 0),
      totalSpent: Number(row.total_spent ?? 0),
      joinedAt: row.createdAt.toISOString(),
      planLabel: row.plan_slug === "teams" ? "Teams" : row.plan_slug === "pro" ? "Pro" : "Free",
      lastActiveAt: row.last_active_at ? row.last_active_at.toISOString() : null,
      progressPercent: Number(row.progress_percent ?? 0),
      progressStatus: row.progress_status,
    })),
    total,
    pageCount,
    countries: countries
      .map((entry) => entry.country?.trim())
      .filter((country): country is string => Boolean(country)),
  };
}
