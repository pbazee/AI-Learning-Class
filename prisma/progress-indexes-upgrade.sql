CREATE INDEX IF NOT EXISTS lesson_progress_lesson_idx
  ON "LessonProgress" ("lessonId");

CREATE INDEX IF NOT EXISTS lesson_progress_asset_idx
  ON "LessonProgress" ("assetId");

CREATE INDEX IF NOT EXISTS lesson_progress_user_lesson_idx
  ON "LessonProgress" ("userId", "lessonId");

CREATE INDEX IF NOT EXISTS lesson_progress_user_lesson_asset_idx
  ON "LessonProgress" ("userId", "lessonId", "assetId");
