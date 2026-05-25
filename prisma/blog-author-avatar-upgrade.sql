ALTER TABLE "BlogPost"
ADD COLUMN IF NOT EXISTS "author_avatar_url" TEXT,
ADD COLUMN IF NOT EXISTS "author_avatar_path" TEXT;
