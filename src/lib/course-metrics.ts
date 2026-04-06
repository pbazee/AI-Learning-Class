import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DatabaseClient = Prisma.TransactionClient | PrismaClient;

const COUNTABLE_ENROLLMENT_STATUSES = ["ACTIVE", "COMPLETED"] as const;

export async function getCourseEnrollmentCounts(
  courseIds: string[],
  db: DatabaseClient = prisma
) {
  const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)));

  if (uniqueCourseIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await db.enrollment.groupBy({
    by: ["courseId"],
    where: {
      courseId: { in: uniqueCourseIds },
      status: { in: [...COUNTABLE_ENROLLMENT_STATUSES] },
    },
    _count: {
      courseId: true,
    },
  });

  return new Map(rows.map((row) => [row.courseId, row._count.courseId]));
}

export async function syncCourseEnrollmentCounts(
  courseIds: string[],
  db: DatabaseClient = prisma
) {
  const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)));

  if (uniqueCourseIds.length === 0) {
    return new Map<string, number>();
  }

  const counts = await getCourseEnrollmentCounts(uniqueCourseIds, db);

  await Promise.all(
    uniqueCourseIds.map((courseId) =>
      db.course.update({
        where: { id: courseId },
        data: {
          totalStudents: counts.get(courseId) ?? 0,
        },
      })
    )
  );

  return counts;
}

export async function syncCourseEnrollmentCount(
  courseId: string,
  db: DatabaseClient = prisma
) {
  const counts = await syncCourseEnrollmentCounts([courseId], db);
  return counts.get(courseId) ?? 0;
}
