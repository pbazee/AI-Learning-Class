INSERT INTO "SiteSettings" ("id", "siteName", "adminEmail", "updatedAt")
VALUES ('singleton', 'AI Genius Lab', 'peterkinuthia726@gmail.com', NOW())
ON CONFLICT ("id") DO UPDATE
SET "adminEmail" = EXCLUDED."adminEmail",
    "updatedAt" = NOW();

UPDATE "User"
SET "role" = 'ADMIN',
    "updatedAt" = NOW()
WHERE LOWER("email") = LOWER('peterkinuthia726@gmail.com');

