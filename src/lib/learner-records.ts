import "server-only";

import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type WishlistRow = {
  course_id: string;
};

type UserCourseRow = {
  course_id: string;
  completed: boolean;
  completed_at: Date | null;
};

export type CompletedCourseCertificateRecord = {
  id: string;
  code: string;
  issuedAt: string;
  pdfUrl?: string;
  blockchainHash?: string;
  course: {
    id: string;
    title: string;
    slug: string;
  };
};

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

let userWishlistsTableReady: Promise<void> | null = null;
let userCoursesTableReady: Promise<void> | null = null;

function formatDate(date?: Date | null) {
  return date ? fullDateFormatter.format(date) : "";
}

function buildCertificateCode(courseId: string) {
  return `ALC-${courseId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

async function ensureUserWishlistsTable() {
  if (!userWishlistsTableReady) {
    userWishlistsTableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS user_wishlists (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
          course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (user_id, course_id)
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS user_wishlists_lookup_idx
        ON user_wishlists (user_id, created_at DESC);
      `);
    })().catch((error) => {
      userWishlistsTableReady = null;
      throw error;
    });
  }

  await userWishlistsTableReady;
}

async function ensureUserCoursesTable() {
  if (!userCoursesTableReady) {
    userCoursesTableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS user_courses (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
          course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          completed_at TIMESTAMPTZ NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (user_id, course_id)
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS user_courses_lookup_idx
        ON user_courses (user_id, completed, updated_at DESC);
      `);
    })().catch((error) => {
      userCoursesTableReady = null;
      throw error;
    });
  }

  await userCoursesTableReady;
}

export async function getUserWishlistCourseIds(userId: string, courseIds?: string[]) {
  await ensureUserWishlistsTable();

  if (courseIds && courseIds.length === 0) {
    return [];
  }

  const rows = courseIds && courseIds.length > 0
    ? await prisma.$queryRaw<WishlistRow[]>(Prisma.sql`
        SELECT course_id
        FROM user_wishlists
        WHERE user_id = ${userId}
          AND course_id IN (${Prisma.join(courseIds)})
      `)
    : await prisma.$queryRaw<WishlistRow[]>(Prisma.sql`
        SELECT course_id
        FROM user_wishlists
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `);

  return rows.map((row) => row.course_id);
}

export async function getUserWishlistCourses(userId: string) {
  const courseIds = await getUserWishlistCourseIds(userId);

  if (courseIds.length === 0) {
    return [];
  }

  return prisma.course.findMany({
    where: {
      id: { in: courseIds },
      isPublished: true,
    },
    include: { category: true },
  });
}

export async function toggleUserWishlistCourse(userId: string, courseId: string) {
  await ensureUserWishlistsTable();

  const existing = await prisma.$queryRaw<WishlistRow[]>(Prisma.sql`
    SELECT course_id
    FROM user_wishlists
    WHERE user_id = ${userId}
      AND course_id = ${courseId}
    LIMIT 1
  `);

  if (existing.length > 0) {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM user_wishlists
      WHERE user_id = ${userId}
        AND course_id = ${courseId}
    `);

    return { wishlisted: false };
  }

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO user_wishlists (user_id, course_id, created_at)
    VALUES (${userId}, ${courseId}, NOW())
    ON CONFLICT (user_id, course_id) DO NOTHING
  `);

  return { wishlisted: true };
}

export async function syncUserCourseRecords(userId: string) {
  await ensureUserCoursesTable();

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
    include: {
      course: {
        select: {
          id: true,
          totalLessons: true,
          modules: {
            select: {
              lessons: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (enrollments.length === 0) {
    return [];
  }

  const courseIds = enrollments.map((enrollment) => enrollment.courseId);
  const progressRows = await prisma.lessonProgress.findMany({
    where: {
      userId,
      isCompleted: true,
      lesson: {
        module: {
          courseId: { in: courseIds },
        },
      },
    },
    select: {
      completedAt: true,
      updatedAt: true,
      lessonId: true,
      lesson: {
        select: {
          module: {
            select: {
              courseId: true,
            },
          },
        },
      },
    },
  });

  const progressByCourse = progressRows.reduce((accumulator, row) => {
    const courseId = row.lesson.module.courseId;
    const rows = accumulator.get(courseId) ?? [];
    rows.push(row);
    accumulator.set(courseId, rows);
    return accumulator;
  }, new Map<string, typeof progressRows>());

  const syncedRows: Array<{ courseId: string; completed: boolean; completedAt: Date | null }> = [];

  for (const enrollment of enrollments) {
    const lessonIds = enrollment.course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    const totalLessons = lessonIds.length || enrollment.course.totalLessons;
    const completionRows = progressByCourse.get(enrollment.courseId) ?? [];
    const completedLessonIds = new Set(completionRows.map((row) => row.lessonId));
    const completed = enrollment.status === "COMPLETED" || (totalLessons > 0 && completedLessonIds.size >= totalLessons);
    const completedAt = completed
      ? enrollment.completedAt ??
        completionRows
          .map((row) => row.completedAt ?? row.updatedAt)
          .sort((left, right) => right.getTime() - left.getTime())[0] ??
        new Date()
      : null;

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO user_courses (user_id, course_id, completed, completed_at, updated_at)
      VALUES (${userId}, ${enrollment.courseId}, ${completed}, ${completedAt}, NOW())
      ON CONFLICT (user_id, course_id)
      DO UPDATE SET
        completed = EXCLUDED.completed,
        completed_at = EXCLUDED.completed_at,
        updated_at = NOW()
    `);

    syncedRows.push({
      courseId: enrollment.courseId,
      completed,
      completedAt,
    });
  }

  return syncedRows;
}

export async function getCompletedCourseCertificateRecords(userId: string): Promise<CompletedCourseCertificateRecord[]> {
  await syncUserCourseRecords(userId);

  const completedRows = await prisma.$queryRaw<UserCourseRow[]>(Prisma.sql`
    SELECT course_id, completed, completed_at
    FROM user_courses
    WHERE user_id = ${userId}
      AND completed = TRUE
    ORDER BY completed_at DESC NULLS LAST
  `);

  if (completedRows.length === 0) {
    return [];
  }

  const courseIds = completedRows.map((row) => row.course_id);
  const existingCertificates = await prisma.certificate.findMany({
    where: {
      userId,
      courseId: { in: courseIds },
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });

  const certificateByCourseId = new Map<string, (typeof existingCertificates)[number]>();

  for (const certificate of existingCertificates) {
    if (!certificateByCourseId.has(certificate.courseId)) {
      certificateByCourseId.set(certificate.courseId, certificate);
    }
  }

  for (const completedRow of completedRows) {
    if (certificateByCourseId.has(completedRow.course_id)) {
      continue;
    }

    const createdCertificate = await prisma.certificate.create({
      data: {
        userId,
        courseId: completedRow.course_id,
        code: buildCertificateCode(completedRow.course_id),
        issuedAt: completedRow.completed_at ?? new Date(),
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    certificateByCourseId.set(completedRow.course_id, createdCertificate);
  }

  return completedRows
    .map((completedRow) => certificateByCourseId.get(completedRow.course_id))
    .filter(Boolean)
    .map((certificate) => ({
      id: certificate!.id,
      code: certificate!.code,
      issuedAt: formatDate(certificate!.issuedAt),
      pdfUrl: certificate!.pdfUrl ?? undefined,
      blockchainHash: certificate!.blockchainHash ?? undefined,
      course: certificate!.course,
    }));
}

export async function getPublicCertificateByCode(code: string) {
  return prisma.certificate.findUnique({
    where: { code },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
