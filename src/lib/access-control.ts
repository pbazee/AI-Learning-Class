import "server-only";

import { type Prisma } from "@prisma/client";
import {
  EntitlementScope,
  EntitlementSource,
  EntitlementStatus,
} from "@/lib/domain-constants";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type ResolvedCourseAccessSource =
  | "purchase"
  | "free_enrollment"
  | "subscription"
  | "team";

export type ActiveCatalogEntitlement = {
  planSlug: string | null;
  source: ResolvedCourseAccessSource | null;
  expiresAt: Date | null;
  hasAllCoursesAccess: boolean;
  hasFreeCoursesAccess: boolean;
  stripeSubscriptionId: string | null;
  teamWorkspaceId: string | null;
};

export type ResolvedCourseAccess = {
  source: ResolvedCourseAccessSource;
  expiresAt: Date | null;
  planSlug: string | null;
  teamWorkspaceId: string | null;
};

function normalizePlanSource(planSlug?: string | null): ResolvedCourseAccessSource {
  return planSlug?.toLowerCase() === "teams" ? "team" : "subscription";
}

function isTimedAccess(source: ResolvedCourseAccessSource) {
  return source === "subscription" || source === "team";
}

export async function getActiveCatalogEntitlement(
  userId: string,
  db: DbClient = prisma
): Promise<ActiveCatalogEntitlement> {
  const now = new Date();
  const [entitlement, legacySubscription] = await Promise.all([
    db.userEntitlement.findFirst({
      where: {
        userId,
        status: EntitlementStatus.ACTIVE,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        scope: {
          in: [EntitlementScope.ALL_COURSES, EntitlementScope.FREE_COURSES],
        },
      },
      orderBy: [{ planSlug: "desc" }, { endsAt: "desc" }, { createdAt: "desc" }],
      select: {
        planSlug: true,
        scope: true,
        endsAt: true,
        stripeSubscriptionId: true,
        teamWorkspaceId: true,
      },
    }),
    db.userSubscription.findFirst({
      where: {
        userId,
        status: { in: ["ACTIVE", "TRIALING"] },
        currentPeriodEnd: { gte: now },
      },
      orderBy: [{ currentPeriodEnd: "desc" }, { createdAt: "desc" }],
      select: {
        stripeSubscriptionId: true,
        currentPeriodEnd: true,
        plan: {
          select: {
            slug: true,
            coursesIncluded: true,
          },
        },
      },
    }),
  ]);

  if (entitlement) {
    return {
      planSlug: entitlement.planSlug ?? null,
      source: normalizePlanSource(entitlement.planSlug),
      expiresAt: entitlement.endsAt ?? null,
      hasAllCoursesAccess: entitlement.scope === EntitlementScope.ALL_COURSES,
      hasFreeCoursesAccess:
        entitlement.scope === EntitlementScope.ALL_COURSES ||
        entitlement.scope === EntitlementScope.FREE_COURSES,
      stripeSubscriptionId: entitlement.stripeSubscriptionId ?? null,
      teamWorkspaceId: entitlement.teamWorkspaceId ?? null,
    };
  }

  const legacyPlanSlug = legacySubscription?.plan.slug ?? null;
  const legacyCoursesIncluded = legacySubscription?.plan.coursesIncluded ?? [];

  return {
    planSlug: legacyPlanSlug,
    source: legacyPlanSlug ? normalizePlanSource(legacyPlanSlug) : null,
    expiresAt: legacySubscription?.currentPeriodEnd ?? null,
    hasAllCoursesAccess: legacyCoursesIncluded.includes("ALL"),
    hasFreeCoursesAccess:
      legacyCoursesIncluded.includes("ALL") || legacyCoursesIncluded.includes("FREE"),
    stripeSubscriptionId: legacySubscription?.stripeSubscriptionId ?? null,
    teamWorkspaceId: null,
  };
}

export async function getAccessibleCourseAccessByCourseId(
  userId: string,
  courseIds: string[],
  db: DbClient = prisma
): Promise<Map<string, ResolvedCourseAccess>> {
  const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)));

  if (uniqueCourseIds.length === 0) {
    return new Map<string, ResolvedCourseAccess>();
  }

  const now = new Date();
  const [courses, enrollments, catalogEntitlement] = await Promise.all([
    db.course.findMany({
      where: {
        id: { in: uniqueCourseIds },
        isPublished: true,
      },
      select: {
        id: true,
        isFree: true,
        price: true,
      },
    }),
    db.enrollment.findMany({
      where: {
        userId,
        courseId: { in: uniqueCourseIds },
        status: { in: ["ACTIVE", "COMPLETED"] },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      select: {
        courseId: true,
        expiresAt: true,
      },
    }),
    getActiveCatalogEntitlement(userId, db),
  ]);

  const courseById = new Map(courses.map((course) => [course.id, course]));
  const accessByCourseId = new Map<string, ResolvedCourseAccess>();

  for (const enrollment of enrollments) {
    const course = courseById.get(enrollment.courseId);

    if (!course) {
      continue;
    }

    if (enrollment.expiresAt === null) {
      accessByCourseId.set(enrollment.courseId, {
        source: course.isFree || course.price === 0 ? "free_enrollment" : "purchase",
        expiresAt: null,
        planSlug: null,
        teamWorkspaceId: null,
      });
      continue;
    }

    accessByCourseId.set(enrollment.courseId, {
      source: catalogEntitlement.source ?? "subscription",
      expiresAt: enrollment.expiresAt,
      planSlug: catalogEntitlement.planSlug,
      teamWorkspaceId: catalogEntitlement.teamWorkspaceId,
    });
  }

  if (catalogEntitlement.hasAllCoursesAccess || catalogEntitlement.hasFreeCoursesAccess) {
    for (const course of courses) {
      if (accessByCourseId.has(course.id)) {
        continue;
      }

      const canAccess =
        catalogEntitlement.hasAllCoursesAccess ||
        (catalogEntitlement.hasFreeCoursesAccess && (course.isFree || course.price === 0));

      if (!canAccess || !catalogEntitlement.source) {
        continue;
      }

      accessByCourseId.set(course.id, {
        source: catalogEntitlement.source,
        expiresAt: catalogEntitlement.expiresAt,
        planSlug: catalogEntitlement.planSlug,
        teamWorkspaceId: catalogEntitlement.teamWorkspaceId,
      });
    }
  }

  return accessByCourseId;
}

export async function upsertManagedSubscriptionEntitlement(
  db: DbClient,
  {
    userId,
    planSlug,
    stripeSubscriptionId,
    teamWorkspaceId,
    startsAt,
    endsAt,
  }: {
    userId: string;
    planSlug: string;
    stripeSubscriptionId?: string | null;
    teamWorkspaceId?: string | null;
    startsAt: Date;
    endsAt: Date;
  }
) {
  await db.userEntitlement.updateMany({
    where: {
      userId,
      status: EntitlementStatus.ACTIVE,
      source: EntitlementSource.SUBSCRIPTION,
      scope: { in: [EntitlementScope.ALL_COURSES, EntitlementScope.FREE_COURSES] },
    },
    data: {
      status: EntitlementStatus.CANCELLED,
      endsAt: startsAt,
    },
  });

  return db.userEntitlement.create({
    data: {
      userId,
      scope:
        planSlug.toLowerCase() === "free"
          ? EntitlementScope.FREE_COURSES
          : EntitlementScope.ALL_COURSES,
      source: EntitlementSource.SUBSCRIPTION,
      status: EntitlementStatus.ACTIVE,
      planSlug,
      stripeSubscriptionId: stripeSubscriptionId ?? null,
      teamWorkspaceId: teamWorkspaceId ?? null,
      startsAt,
      endsAt,
    },
  });
}

export async function upsertTeamMemberEntitlement(
  db: DbClient,
  {
    userId,
    workspaceId,
    startsAt,
    endsAt,
  }: {
    userId: string;
    workspaceId: string;
    startsAt: Date;
    endsAt: Date;
  }
) {
  await db.userEntitlement.updateMany({
    where: {
      userId,
      teamWorkspaceId: workspaceId,
      source: EntitlementSource.TEAM,
      scope: EntitlementScope.ALL_COURSES,
    },
    data: {
      status: EntitlementStatus.CANCELLED,
      endsAt: startsAt,
    },
  });

  return db.userEntitlement.create({
    data: {
      userId,
      teamWorkspaceId: workspaceId,
      scope: EntitlementScope.ALL_COURSES,
      source: EntitlementSource.TEAM,
      status: EntitlementStatus.ACTIVE,
      planSlug: "teams",
      startsAt,
      endsAt,
    },
  });
}

export async function revokeCatalogEntitlements(
  db: DbClient,
  {
    userId,
    source,
    teamWorkspaceId,
    at = new Date(),
  }: {
    userId: string;
    source?: EntitlementSource;
    teamWorkspaceId?: string | null;
    at?: Date;
  }
) {
  await db.userEntitlement.updateMany({
    where: {
      userId,
      status: EntitlementStatus.ACTIVE,
      ...(source ? { source } : {}),
      ...(teamWorkspaceId ? { teamWorkspaceId } : {}),
    },
    data: {
      status: EntitlementStatus.REVOKED,
      endsAt: at,
    },
  });

  await db.enrollment.updateMany({
    where: {
      userId,
      expiresAt: { not: null, gt: at },
      ...(source === EntitlementSource.TEAM && teamWorkspaceId
        ? {}
        : {}),
    },
    data: {
      status: "EXPIRED",
      expiresAt: at,
    },
  });
}

export function isTimedCourseAccess(access?: { source?: ResolvedCourseAccessSource | null }) {
  return access?.source ? isTimedAccess(access.source) : false;
}
