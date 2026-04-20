import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaConnectionError, logPrismaConnectionEvent } from "@/lib/prisma-errors";

let lessonPreviewColumnsReady = false;
let lessonPreviewColumnsPromise: Promise<boolean> | null = null;

export async function ensureLessonPreviewColumns() {
  if (lessonPreviewColumnsReady) {
    return true;
  }

  if (!lessonPreviewColumnsPromise) {
    lessonPreviewColumnsPromise = (async () => {
      try {
        await prisma.$executeRaw(Prisma.sql`
          ALTER TABLE "Lesson"
          ADD COLUMN IF NOT EXISTS preview_pages INTEGER
        `);
        await prisma.$executeRaw(Prisma.sql`
          ALTER TABLE "Lesson"
          ADD COLUMN IF NOT EXISTS preview_minutes INTEGER
        `);
        lessonPreviewColumnsReady = true;
        return true;
      } catch (error) {
        lessonPreviewColumnsReady = false;

        if (isPrismaConnectionError(error)) {
          logPrismaConnectionEvent(
            "lessonPreviewColumns",
            "[lesson-preview] Unable to ensure lesson preview columns right now.",
            error,
            "warn"
          );
          return false;
        }

        throw error;
      }
    })().catch((error) => {
      lessonPreviewColumnsPromise = null;
      throw error;
    });
  }

  const isReady = await lessonPreviewColumnsPromise;

  if (!isReady) {
    lessonPreviewColumnsPromise = null;
  }

  return isReady;
}
