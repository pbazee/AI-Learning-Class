import "server-only";

import { Prisma } from "@prisma/client";
import { clampPercentage } from "@/lib/site";
import { isPrismaConnectionError, prisma } from "@/lib/prisma";

export type LessonPlayerNote = {
  id: string;
  content: string;
  timestamp: string;
};

export type WorkspaceLessonNote = LessonPlayerNote & {
  lessonId: string;
  lessonTitle: string;
  courseSlug: string;
  courseTitle: string;
};

type LessonNoteRow = {
  id: bigint | number | string;
  content: string;
  timestamp: Date;
};

type WorkspaceLessonNoteRow = LessonNoteRow & {
  lesson_id: string;
  lesson_title: string;
  course_slug: string;
  course_title: string;
};

type LessonNotesTableCheckRow = {
  relation_name: string | null;
};

let lessonNotesTableReady: Promise<boolean> | null = null;
let lessonNotesTableAvailable = false;
let lessonProgressColumnsReady: Promise<boolean> | null = null;
let lessonProgressColumnsAvailable = false;

async function ensureLessonNotesTable() {
  if (lessonNotesTableAvailable) {
    return true;
  }

  if (!lessonNotesTableReady) {
    lessonNotesTableReady = (async () => {
      try {
        await prisma.$connect();
        await prisma.$queryRaw(Prisma.sql`SELECT 1`);
      } catch (error) {
        if (isPrismaConnectionError(error)) {
          console.error(
            "[lesson-player] Database connection check failed while preparing lesson notes. Notes will fall back safely.",
            error
          );
          return false;
        }

        throw error;
      }

      try {
        const existingTable = await prisma.$queryRaw<LessonNotesTableCheckRow[]>(Prisma.sql`
          SELECT to_regclass('public.lesson_notes')::text AS relation_name
        `);

        if (!existingTable[0]?.relation_name) {
          await prisma.$executeRaw(Prisma.sql`
            CREATE TABLE IF NOT EXISTS lesson_notes (
              id BIGSERIAL PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
              lesson_id TEXT NOT NULL REFERENCES "Lesson"(id) ON DELETE CASCADE,
              content TEXT NOT NULL,
              "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
          `);
        }

        await prisma.$executeRaw(Prisma.sql`
          CREATE INDEX IF NOT EXISTS lesson_notes_lookup_idx
          ON lesson_notes (user_id, lesson_id, "timestamp" DESC)
        `);

        lessonNotesTableAvailable = true;
        return true;
      } catch (error) {
        lessonNotesTableAvailable = false;

        if (isPrismaConnectionError(error)) {
          console.error(
            "[lesson-player] Lesson notes table setup could not complete because the database is currently unreachable. Returning a safe fallback instead.",
            error
          );
          return false;
        }

        throw error;
      }
    })().catch((error) => {
      lessonNotesTableReady = null;
      throw error;
    });
  }

  const isReady = await lessonNotesTableReady;

  if (!isReady) {
    lessonNotesTableReady = null;
  }

  return isReady;
}

function serializeNote(row: LessonNoteRow): LessonPlayerNote {
  return {
    id: String(row.id),
    content: row.content,
    timestamp: row.timestamp.toISOString(),
  };
}

function serializeWorkspaceNote(row: WorkspaceLessonNoteRow): WorkspaceLessonNote {
  return {
    ...serializeNote(row),
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    courseSlug: row.course_slug,
    courseTitle: row.course_title,
  };
}

export async function ensureLessonProgressColumns() {
  if (lessonProgressColumnsAvailable) {
    return true;
  }

  if (!lessonProgressColumnsReady) {
    lessonProgressColumnsReady = (async () => {
      try {
        await prisma.$executeRaw(Prisma.sql`
          ALTER TABLE "LessonProgress"
          ADD COLUMN IF NOT EXISTS "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0
        `);
        await prisma.$executeRaw(Prisma.sql`
          ALTER TABLE "LessonProgress"
          ADD COLUMN IF NOT EXISTS "lastPdfPage" INTEGER
        `);
        await prisma.$executeRaw(Prisma.sql`
          UPDATE "LessonProgress"
          SET "progressPercent" = CASE WHEN "isCompleted" = TRUE THEN 100 ELSE COALESCE("progressPercent", 0) END
          WHERE "progressPercent" IS NULL OR ("isCompleted" = TRUE AND "progressPercent" < 100)
        `);

        lessonProgressColumnsAvailable = true;
        return true;
      } catch (error) {
        lessonProgressColumnsAvailable = false;

        if (isPrismaConnectionError(error)) {
          console.error(
            "[lesson-player] Unable to ensure lesson progress columns right now.",
            error
          );
          return false;
        }

        throw error;
      }
    })().catch((error) => {
      lessonProgressColumnsReady = null;
      throw error;
    });
  }

  const isReady = await lessonProgressColumnsReady;

  if (!isReady) {
    lessonProgressColumnsReady = null;
  }

  return isReady;
}

export async function getCourseProgressState(userId: string, courseId: string) {
  await ensureLessonProgressColumns();

  const [lessons, progressRows] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        module: {
          courseId,
        },
      },
      select: {
        id: true,
      },
      orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
    }),
    prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: {
          module: {
            courseId,
          },
        },
      },
      select: {
        lessonId: true,
        isCompleted: true,
        progressPercent: true,
        watchedSeconds: true,
        lastPdfPage: true,
      },
    }),
  ]);

  const lessonProgressByLessonId = Object.fromEntries(
    progressRows.map((row) => [
      row.lessonId,
      {
        progressPercent: clampPercentage(row.isCompleted ? 100 : row.progressPercent ?? 0),
        watchedSeconds: row.watchedSeconds,
        lastPdfPage: row.lastPdfPage ?? null,
        isCompleted: row.isCompleted,
      },
    ])
  );

  const completedLessonIds = lessons
    .filter((lesson) => {
      const progress = lessonProgressByLessonId[lesson.id];
      return Boolean(progress?.isCompleted || (progress?.progressPercent ?? 0) >= 100);
    })
    .map((lesson) => lesson.id);
  const completedCount = completedLessonIds.length;
  const totalLessons = lessons.length;
  const percentage =
    totalLessons > 0
      ? Math.round(
          lessons.reduce(
            (sum, lesson) => sum + (lessonProgressByLessonId[lesson.id]?.progressPercent ?? 0),
            0
          ) / totalLessons
        )
      : 0;

  return {
    completedLessonIds,
    completedCount,
    totalLessons,
    percentage,
    lessonProgressByLessonId,
  };
}

export async function getLessonNotes(userId: string, lessonId: string) {
  const notesTableReady = await ensureLessonNotesTable();

  if (!notesTableReady) {
    return [];
  }

  try {
    const rows = await prisma.$queryRaw<LessonNoteRow[]>(Prisma.sql`
      SELECT id, content, "timestamp"
      FROM lesson_notes
      WHERE user_id = ${userId}
        AND lesson_id = ${lessonId}
      ORDER BY "timestamp" DESC
    `);

    return rows.map(serializeNote);
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      console.error("[lesson-player] Unable to load lesson notes. Returning an empty note list.", error);
      return [];
    }

    throw error;
  }
}

export async function createLessonNote(userId: string, lessonId: string, content: string) {
  const notesTableReady = await ensureLessonNotesTable();

  if (!notesTableReady) {
    return null;
  }

  try {
    const rows = await prisma.$queryRaw<LessonNoteRow[]>(Prisma.sql`
      INSERT INTO lesson_notes (user_id, lesson_id, content, "timestamp")
      VALUES (${userId}, ${lessonId}, ${content}, NOW())
      RETURNING id, content, "timestamp"
    `);

    return rows.map(serializeNote)[0] ?? null;
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      console.error("[lesson-player] Unable to save lesson notes right now.", error);
      return null;
    }

    throw error;
  }
}

export async function getUserWorkspaceNotes(userId: string, limit = 10) {
  const notesTableReady = await ensureLessonNotesTable();

  if (!notesTableReady) {
    return [];
  }

  try {
    const rows = await prisma.$queryRaw<WorkspaceLessonNoteRow[]>(Prisma.sql`
      SELECT
        ln.id,
        ln.content,
        ln."timestamp",
        l.id AS lesson_id,
        l.title AS lesson_title,
        c.slug AS course_slug,
        c.title AS course_title
      FROM lesson_notes ln
      INNER JOIN "Lesson" l ON l.id = ln.lesson_id
      INNER JOIN "Module" m ON m.id = l."moduleId"
      INNER JOIN "Course" c ON c.id = m."courseId"
      WHERE ln.user_id = ${userId}
      ORDER BY ln."timestamp" DESC
      LIMIT ${limit}
    `);

    return rows.map(serializeWorkspaceNote);
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      console.error("[lesson-player] Unable to load workspace lesson notes. Returning an empty list.", error);
      return [];
    }

    throw error;
  }
}
