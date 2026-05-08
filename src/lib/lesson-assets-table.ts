import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaConnectionError, logPrismaConnectionEvent } from "@/lib/prisma-errors";

let lessonAssetsTableReady = false;
let lessonAssetsTablePromise: Promise<boolean> | null = null;

export async function ensureLessonAssetsTable() {
  if (lessonAssetsTableReady) {
    return true;
  }

  if (!lessonAssetsTablePromise) {
    lessonAssetsTablePromise = (async () => {
      try {
        await prisma.$executeRaw(Prisma.sql`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_type t
              JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE t.typname = 'LessonAssetType' AND n.nspname = 'public'
            ) THEN
              CREATE TYPE "LessonAssetType" AS ENUM ('video', 'pdf', 'file');
            END IF;
          END
          $$;
        `);
        await prisma.$executeRaw(Prisma.sql`
          CREATE TABLE IF NOT EXISTS lesson_assets (
            id TEXT PRIMARY KEY,
            lesson_id TEXT NOT NULL REFERENCES "Lesson"(id) ON DELETE CASCADE,
            asset_type "LessonAssetType" NOT NULL,
            asset_url TEXT NOT NULL,
            asset_path TEXT,
            file_name TEXT,
            mime_type TEXT,
            size_bytes INTEGER,
            title TEXT,
            is_primary BOOLEAN DEFAULT false,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        await prisma.$executeRaw(Prisma.sql`
          ALTER TABLE lesson_assets
          ALTER COLUMN asset_type TYPE "LessonAssetType"
          USING lower(asset_type::text)::"LessonAssetType"
        `);
        await prisma.$executeRaw(Prisma.sql`
          CREATE INDEX IF NOT EXISTS lesson_assets_lesson_sort_idx
          ON lesson_assets (lesson_id, sort_order)
        `);
        lessonAssetsTableReady = true;
        return true;
      } catch (error) {
        lessonAssetsTableReady = false;

        if (isPrismaConnectionError(error)) {
          logPrismaConnectionEvent(
            "lessonAssetsTable",
            "[lesson-assets] Unable to ensure lesson assets table right now.",
            error,
            "warn"
          );
          return false;
        }

        throw error;
      }
    })().catch((error) => {
      lessonAssetsTablePromise = null;
      throw error;
    });
  }

  const isReady = await lessonAssetsTablePromise;

  if (!isReady) {
    lessonAssetsTablePromise = null;
  }

  return isReady;
}
