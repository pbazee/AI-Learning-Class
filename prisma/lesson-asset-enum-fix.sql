DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'LessonAssetType' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "LessonAssetType" AS ENUM ('video', 'pdf', 'file', 'image');
  END IF;
END
$$;

ALTER TYPE "LessonAssetType" ADD VALUE IF NOT EXISTS 'image';

ALTER TABLE IF EXISTS lesson_assets
ALTER COLUMN asset_type TYPE "LessonAssetType"
USING lower(asset_type::text)::"LessonAssetType";
