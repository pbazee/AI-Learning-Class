import "server-only";

import { CourseAssetType, LessonType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaConnectionError } from "@/lib/prisma-errors";
import { clampPercentage } from "@/lib/site";

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

export type LessonProgressContentType = "video" | "audio" | "pdf";

export type SerializedLessonProgress = {
  lessonId: string;
  contentType: LessonProgressContentType | null;
  progressPercent: number;
  lastPosition: number | null;
  lastPage: number | null;
  watchedSeconds: number;
  lastPdfPage: number | null;
  isCompleted: boolean;
  completedAt: string | null;
  updatedAt: string | null;
};

type LessonProgressRow = {
  lessonId: string;
  contentType: CourseAssetType | null;
  isCompleted: boolean;
  progressPercent: number;
  watchedSeconds: number;
  lastPosition: number | null;
  lastPdfPage: number | null;
  lastPage: number | null;
  completedAt: Date | null;
  updatedAt: Date;
};

type UpsertLessonProgressInput = {
  userId: string;
  lessonId: string;
  courseId: string;
  lessonType: LessonType;
  contentType?: LessonProgressContentType | CourseAssetType | null;
  touchOnly?: boolean;
  isCompleted?: boolean;
  manualCompletionState?: "COMPLETE" | "INCOMPLETE";
  progressPercent?: number;
  lastPosition?: number | null;
  lastPage?: number | null;
};

export type CourseProgressState = Awaited<ReturnType<typeof getCourseProgressState>>;

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

function toSerializedContentType(value: CourseAssetType | null | undefined): LessonProgressContentType | null {
  switch (value) {
    case "VIDEO":
      return "video";
    case "AUDIO":
      return "audio";
    case "PDF":
      return "pdf";
    default:
      return null;
  }
}

function toStoredContentType(
  value: LessonProgressContentType | CourseAssetType | null | undefined,
  lessonType?: LessonType
) {
  if (value === "VIDEO" || value === "AUDIO" || value === "PDF") {
    return value;
  }

  if (value === "video" || value === "audio" || value === "pdf") {
    return value.toUpperCase() as CourseAssetType;
  }

  switch (lessonType) {
    case "VIDEO":
    case "LIVE":
      return "VIDEO";
    case "AUDIO":
      return "AUDIO";
    case "PDF":
      return "PDF";
    default:
      return null;
  }
}

function serializeLessonProgress(row: LessonProgressRow): SerializedLessonProgress {
  const lastPosition = row.lastPosition ?? row.watchedSeconds ?? null;
  const lastPage = row.lastPage ?? row.lastPdfPage ?? null;
  const progressPercent = clampPercentage(row.isCompleted ? 100 : row.progressPercent ?? 0);

  return {
    lessonId: row.lessonId,
    contentType: toSerializedContentType(row.contentType),
    progressPercent,
    lastPosition,
    lastPage,
    watchedSeconds: lastPosition ?? 0,
    lastPdfPage: lastPage,
    isCompleted: row.isCompleted || progressPercent >= 100,
    completedAt: row.completedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function clampWholeSeconds(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.round(value));
}

function clampWholePage(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(1, Math.round(value));
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
          ALTER TABLE "LessonProgress"
          ADD COLUMN IF NOT EXISTS "contentType" "CourseAssetType"
        `);
        await prisma.$executeRaw(Prisma.sql`
          ALTER TABLE "LessonProgress"
          ADD COLUMN IF NOT EXISTS "lastPosition" INTEGER
        `);
        await prisma.$executeRaw(Prisma.sql`
          ALTER TABLE "LessonProgress"
          ADD COLUMN IF NOT EXISTS "lastPage" INTEGER
        `);
        await prisma.$executeRaw(Prisma.sql`
          UPDATE "LessonProgress"
          SET "progressPercent" = CASE WHEN "isCompleted" = TRUE THEN 100 ELSE COALESCE("progressPercent", 0) END
          WHERE "progressPercent" IS NULL OR ("isCompleted" = TRUE AND "progressPercent" < 100)
        `);
        await prisma.$executeRaw(Prisma.sql`
          UPDATE "LessonProgress"
          SET "lastPosition" = COALESCE("lastPosition", "watchedSeconds")
          WHERE "lastPosition" IS NULL AND COALESCE("watchedSeconds", 0) > 0
        `);
        await prisma.$executeRaw(Prisma.sql`
          UPDATE "LessonProgress"
          SET "lastPage" = COALESCE("lastPage", "lastPdfPage")
          WHERE "lastPage" IS NULL AND "lastPdfPage" IS NOT NULL
        `);
        await prisma.$executeRaw(Prisma.sql`
          UPDATE "LessonProgress" AS lp
          SET "contentType" = CASE l."type"::text
            WHEN 'VIDEO' THEN 'VIDEO'::"CourseAssetType"
            WHEN 'LIVE' THEN 'VIDEO'::"CourseAssetType"
            WHEN 'AUDIO' THEN 'AUDIO'::"CourseAssetType"
            WHEN 'PDF' THEN 'PDF'::"CourseAssetType"
            ELSE lp."contentType"
          END
          FROM "Lesson" AS l
          WHERE lp."lessonId" = l.id
            AND lp."contentType" IS NULL
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
        contentType: true,
        isCompleted: true,
        progressPercent: true,
        watchedSeconds: true,
        lastPosition: true,
        lastPdfPage: true,
        lastPage: true,
        completedAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const lessonProgressByLessonId = Object.fromEntries(
    progressRows.map((row) => [
      row.lessonId,
      serializeLessonProgress(row),
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

export async function getLessonProgressEntry(userId: string, lessonId: string) {
  await ensureLessonProgressColumns();

  const row = await prisma.lessonProgress.findUnique({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
    select: {
      lessonId: true,
      contentType: true,
      isCompleted: true,
      progressPercent: true,
      watchedSeconds: true,
      lastPosition: true,
      lastPdfPage: true,
      lastPage: true,
      completedAt: true,
      updatedAt: true,
    },
  });

  return row ? serializeLessonProgress(row) : null;
}

export async function upsertLessonProgressEntry({
  userId,
  lessonId,
  courseId,
  lessonType,
  contentType,
  touchOnly,
  isCompleted,
  manualCompletionState,
  progressPercent,
  lastPosition,
  lastPage,
}: UpsertLessonProgressInput) {
  await ensureLessonProgressColumns();

  const existingProgress = await prisma.lessonProgress.findUnique({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
    select: {
      lessonId: true,
      contentType: true,
      isCompleted: true,
      progressPercent: true,
      watchedSeconds: true,
      lastPosition: true,
      lastPdfPage: true,
      lastPage: true,
      completedAt: true,
      updatedAt: true,
    },
  });

  if (touchOnly) {
    const row = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        watchedSeconds: {
          increment: 0,
        },
      },
      create: {
        userId,
        lessonId,
        contentType: toStoredContentType(contentType, lessonType),
        isCompleted: false,
        progressPercent: 0,
        completedAt: null,
      },
      select: {
        lessonId: true,
        contentType: true,
        isCompleted: true,
        progressPercent: true,
        watchedSeconds: true,
        lastPosition: true,
        lastPdfPage: true,
        lastPage: true,
        completedAt: true,
        updatedAt: true,
      },
    });

    const courseProgress = await getCourseProgressState(userId, courseId);
    await prisma.enrollment.updateMany({
      where: {
        userId,
        courseId,
      },
      data: {
        status: courseProgress.percentage === 100 ? "COMPLETED" : "ACTIVE",
        completedAt: courseProgress.percentage === 100 ? new Date() : null,
      },
    });

    return {
      progress: serializeLessonProgress(row),
      courseProgress,
    };
  }

  const storedContentType =
    toStoredContentType(contentType, lessonType) ??
    existingProgress?.contentType ??
    toStoredContentType(undefined, lessonType);
  const requestedProgressPercent =
    typeof progressPercent === "number"
      ? clampPercentage(progressPercent)
      : undefined;
  const requestedLastPosition =
    lastPosition === null ? null : clampWholeSeconds(lastPosition);
  const requestedLastPage = lastPage === null ? null : clampWholePage(lastPage);
  const fallbackLastPosition = existingProgress?.lastPosition ?? existingProgress?.watchedSeconds ?? 0;
  const fallbackLastPage = existingProgress?.lastPage ?? existingProgress?.lastPdfPage ?? null;
  const isManualIncomplete = manualCompletionState === "INCOMPLETE";
  const nextIsCompleted =
    manualCompletionState === "COMPLETE"
      ? true
      : isManualIncomplete
        ? false
        : isCompleted === true
          ? true
          : isCompleted === false
            ? false
            : (requestedProgressPercent ?? existingProgress?.progressPercent ?? 0) >= 100 || existingProgress?.isCompleted === true;
  // When manually marking incomplete, always reset to 0% so getCourseProgressState
  // no longer counts this lesson as completed (it checks both isCompleted AND progressPercent >= 100).
  const nextProgressPercent = nextIsCompleted
    ? 100
    : isManualIncomplete
      ? 0
      : requestedProgressPercent ?? clampPercentage(existingProgress?.progressPercent ?? 0);
  const nextLastPosition =
    storedContentType === "VIDEO" || storedContentType === "AUDIO"
      ? nextIsCompleted
        ? null
        : isManualIncomplete
          ? null
          : requestedLastPosition ?? fallbackLastPosition
      : null;
  const nextLastPage =
    storedContentType === "PDF"
      ? isManualIncomplete
        ? null
        : requestedLastPage ?? fallbackLastPage
      : null;

  const row = await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
    update: {
      contentType: storedContentType,
      isCompleted: nextIsCompleted,
      progressPercent: nextProgressPercent,
      watchedSeconds: nextLastPosition ?? 0,
      lastPosition: nextLastPosition,
      lastPdfPage: nextLastPage,
      lastPage: nextLastPage,
      completedAt: nextIsCompleted ? new Date() : null,
    },
    create: {
      userId,
      lessonId,
      contentType: storedContentType,
      isCompleted: nextIsCompleted,
      progressPercent: nextProgressPercent,
      watchedSeconds: nextLastPosition ?? 0,
      lastPosition: nextLastPosition,
      lastPdfPage: nextLastPage,
      lastPage: nextLastPage,
      completedAt: nextIsCompleted ? new Date() : null,
    },
    select: {
      lessonId: true,
      contentType: true,
      isCompleted: true,
      progressPercent: true,
      watchedSeconds: true,
      lastPosition: true,
      lastPdfPage: true,
      lastPage: true,
      completedAt: true,
      updatedAt: true,
    },
  });

  const courseProgress = await getCourseProgressState(userId, courseId);
  await prisma.enrollment.updateMany({
    where: {
      userId,
      courseId,
    },
    data: {
      status: courseProgress.percentage === 100 ? "COMPLETED" : "ACTIVE",
      completedAt: courseProgress.percentage === 100 ? new Date() : null,
    },
  });

  return {
    progress: serializeLessonProgress(row),
    courseProgress,
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
