BEGIN;

DO $$
DECLARE
  keep_user_id TEXT;
BEGIN
  SELECT id
  INTO keep_user_id
  FROM "User"
  WHERE lower(email) = lower('peterkinuthia726@gmail.com')
  LIMIT 1;

  IF keep_user_id IS NULL THEN
    RAISE EXCEPTION 'Keep user not found for email %', 'peterkinuthia726@gmail.com';
  END IF;

  CREATE TEMP TABLE keep_user_ids ON COMMIT DROP AS
  SELECT keep_user_id AS id;

  CREATE TEMP TABLE users_to_delete ON COMMIT DROP AS
  SELECT u.id
  FROM "User" u
  WHERE u.id <> keep_user_id;

  CREATE TEMP TABLE courses_to_delete ON COMMIT DROP AS
  SELECT c.id
  FROM "Course" c;

  CREATE TEMP TABLE modules_to_delete ON COMMIT DROP AS
  SELECT m.id
  FROM "Module" m
  WHERE m."courseId" IN (SELECT id FROM courses_to_delete);

  CREATE TEMP TABLE lessons_to_delete ON COMMIT DROP AS
  SELECT l.id
  FROM "Lesson" l
  WHERE l."moduleId" IN (SELECT id FROM modules_to_delete);

  CREATE TEMP TABLE quizzes_to_delete ON COMMIT DROP AS
  SELECT q.id
  FROM "Quiz" q
  WHERE q."lessonId" IN (SELECT id FROM lessons_to_delete);

  UPDATE "BlogPost"
  SET "authorId" = keep_user_id
  WHERE "authorId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "AffiliateConversion"
  WHERE "affiliateId" IN (
    SELECT id FROM "Affiliate" WHERE "userId" IN (SELECT id FROM users_to_delete)
  );

  DELETE FROM "AffiliatePayout"
  WHERE "affiliateId" IN (
    SELECT id FROM "Affiliate" WHERE "userId" IN (SELECT id FROM users_to_delete)
  );

  DELETE FROM "Affiliate"
  WHERE "userId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "Referral"
  WHERE "referrerId" IN (SELECT id FROM users_to_delete)
     OR "referredId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "OrderItem"
  WHERE "courseId" IN (SELECT id FROM courses_to_delete)
     OR "orderId" IN (
       SELECT id FROM "Order" WHERE "userId" IN (SELECT id FROM users_to_delete)
     );

  DELETE FROM "Order"
  WHERE "userId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "Review"
  WHERE "courseId" IN (SELECT id FROM courses_to_delete)
     OR "userId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "Certificate"
  WHERE "courseId" IN (SELECT id FROM courses_to_delete)
     OR "userId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "Enrollment"
  WHERE "courseId" IN (SELECT id FROM courses_to_delete)
     OR "userId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "LessonProgress"
  WHERE "lessonId" IN (SELECT id FROM lessons_to_delete)
     OR "userId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "QuizResult"
  WHERE "quizId" IN (SELECT id FROM quizzes_to_delete)
     OR "userId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "Question"
  WHERE "quizId" IN (SELECT id FROM quizzes_to_delete);

  DELETE FROM "Quiz"
  WHERE id IN (SELECT id FROM quizzes_to_delete);

  DELETE FROM "AIPrompt"
  WHERE "lessonId" IN (SELECT id FROM lessons_to_delete);

  DELETE FROM "lesson_assets"
  WHERE "lesson_id" IN (SELECT id FROM lessons_to_delete);

  DELETE FROM "lesson_notes"
  WHERE "lesson_id" IN (SELECT id FROM lessons_to_delete)
     OR "user_id" IN (SELECT id FROM users_to_delete);

  DELETE FROM "Lesson"
  WHERE id IN (SELECT id FROM lessons_to_delete);

  DELETE FROM "Module"
  WHERE id IN (SELECT id FROM modules_to_delete);

  DELETE FROM "CourseAsset"
  WHERE "courseId" IN (SELECT id FROM courses_to_delete);

  DELETE FROM "team_course_assignments"
  WHERE "course_id" IN (SELECT id FROM courses_to_delete)
     OR "assigned_to_user_id" IN (SELECT id FROM users_to_delete)
     OR "assigned_by_user_id" IN (SELECT id FROM users_to_delete);

  DELETE FROM "user_entitlements"
  WHERE "course_id" IN (SELECT id FROM courses_to_delete)
     OR "user_id" IN (SELECT id FROM users_to_delete);

  DELETE FROM "user_courses"
  WHERE "course_id" IN (SELECT id FROM courses_to_delete)
     OR "user_id" IN (SELECT id FROM users_to_delete);

  DELETE FROM "user_wishlists"
  WHERE "course_id" IN (SELECT id FROM courses_to_delete)
     OR "user_id" IN (SELECT id FROM users_to_delete);

  DELETE FROM "AIChatSession"
  WHERE "courseId" IN (SELECT id FROM courses_to_delete)
     OR "userId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "Course"
  WHERE id IN (SELECT id FROM courses_to_delete);

  DELETE FROM "UserSubscription"
  WHERE "userId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "BlogComment"
  WHERE "userId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "team_workspace_invites"
  WHERE "invited_user_id" IN (SELECT id FROM users_to_delete)
     OR "invited_by_id" IN (SELECT id FROM users_to_delete);

  DELETE FROM "team_workspace_members"
  WHERE "user_id" IN (SELECT id FROM users_to_delete)
     OR "invited_by_id" IN (SELECT id FROM users_to_delete);

  DELETE FROM "team_workspaces"
  WHERE "owner_user_id" IN (SELECT id FROM users_to_delete);

  DELETE FROM "user_ai_usage"
  WHERE "user_id" IN (SELECT id FROM users_to_delete);

  DELETE FROM "email_preferences"
  WHERE "user_id" IN (SELECT id FROM users_to_delete);

  DELETE FROM "AuditLog"
  WHERE "actorId" IN (SELECT id FROM users_to_delete);

  DELETE FROM "User"
  WHERE id IN (SELECT id FROM users_to_delete);
END $$;

COMMIT;
