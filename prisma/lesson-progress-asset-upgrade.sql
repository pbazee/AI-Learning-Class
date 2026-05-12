ALTER TABLE "LessonProgress"
  ADD COLUMN IF NOT EXISTS "assetId" uuid,
  ADD COLUMN IF NOT EXISTS "lastPosition" integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS lesson_progress_user_lesson_idx
  ON "LessonProgress" ("userId", "lessonId");

CREATE INDEX IF NOT EXISTS lesson_progress_user_lesson_asset_idx
  ON "LessonProgress" ("userId", "lessonId", "assetId");
