import "server-only";

import { Prisma } from "@prisma/client";
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

export async function getCourseProgressState(userId: string, courseId: string) {
  const [completedRows, totalLessons] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: {
        userId,
        isCompleted: true,
        lesson: {
          module: {
            courseId,
          },
        },
      },
      select: {
        lessonId: true,
      },
    }),
    prisma.lesson.count({
      where: {
        module: {
          courseId,
        },
      },
    }),
  ]);

  const completedLessonIds = completedRows.map((row) => row.lessonId);
  const completedCount = completedLessonIds.length;

  return {
    completedLessonIds,
    completedCount,
    totalLessons,
    percentage: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
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
