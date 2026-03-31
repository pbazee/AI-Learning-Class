import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

let lessonNotesTableReady: Promise<void> | null = null;

async function ensureLessonNotesTable() {
  if (!lessonNotesTableReady) {
    lessonNotesTableReady = (async () => {
      // Updated: notes stay in a dedicated SQL table so autosave works without regenerating Prisma.
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS lesson_notes (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
          lesson_id TEXT NOT NULL REFERENCES "Lesson"(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS lesson_notes_lookup_idx
        ON lesson_notes (user_id, lesson_id, "timestamp" DESC);
      `);
    })().catch((error) => {
      lessonNotesTableReady = null;
      throw error;
    });
  }

  await lessonNotesTableReady;
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
  await ensureLessonNotesTable();

  const rows = await prisma.$queryRaw<LessonNoteRow[]>(Prisma.sql`
    SELECT id, content, "timestamp"
    FROM lesson_notes
    WHERE user_id = ${userId}
      AND lesson_id = ${lessonId}
    ORDER BY "timestamp" DESC
  `);

  return rows.map(serializeNote);
}

export async function createLessonNote(userId: string, lessonId: string, content: string) {
  await ensureLessonNotesTable();

  const rows = await prisma.$queryRaw<LessonNoteRow[]>(Prisma.sql`
    INSERT INTO lesson_notes (user_id, lesson_id, content, "timestamp")
    VALUES (${userId}, ${lessonId}, ${content}, NOW())
    RETURNING id, content, "timestamp"
  `);

  return rows.map(serializeNote)[0] ?? null;
}

export async function getUserWorkspaceNotes(userId: string, limit = 10) {
  await ensureLessonNotesTable();

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
}
