DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ContactMessageStatus'
  ) THEN
    CREATE TYPE "ContactMessageStatus" AS ENUM ('UNREAD', 'READ', 'REPLIED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TrustedLogo" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "image_url" TEXT NOT NULL,
  "image_path" TEXT,
  "website_url" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ContactMessage" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "ContactMessageStatus" NOT NULL DEFAULT 'UNREAD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ContactMessageReply" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL REFERENCES "ContactMessage"("id") ON DELETE CASCADE,
  "sender_name" TEXT,
  "sender_email" TEXT,
  "body" TEXT NOT NULL,
  "is_admin" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ContactMessage_status_createdAt_idx"
  ON "ContactMessage"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "ContactMessageReply_message_id_createdAt_idx"
  ON "ContactMessageReply"("message_id", "createdAt");

INSERT INTO "TrustedLogo" ("name", "image_url", "website_url", "order", "isActive")
VALUES
  ('OpenAI', '/trusted-logos/openai.svg', 'https://openai.com', 0, TRUE),
  ('Google', '/trusted-logos/google.svg', 'https://google.com', 1, TRUE),
  ('Microsoft', '/trusted-logos/microsoft.svg', 'https://microsoft.com', 2, TRUE),
  ('Meta', '/trusted-logos/meta.svg', 'https://meta.com', 3, TRUE),
  ('Midjourney', '/trusted-logos/midjourney.svg', 'https://midjourney.com', 4, TRUE),
  ('NVIDIA', '/trusted-logos/nvidia.svg', 'https://nvidia.com', 5, TRUE)
ON CONFLICT ("name") DO UPDATE SET
  "image_url" = EXCLUDED."image_url",
  "website_url" = EXCLUDED."website_url",
  "order" = EXCLUDED."order",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;
