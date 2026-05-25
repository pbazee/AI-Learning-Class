WITH keep_user AS (
  SELECT id, email
  FROM "User"
  WHERE lower(email) = lower('peterkinuthia726@gmail.com')
),
users_to_delete AS (
  SELECT u.id, u.email, u.role
  FROM "User" u
  WHERE NOT EXISTS (
    SELECT 1
    FROM keep_user ku
    WHERE ku.id = u.id
  )
),
courses_to_delete AS (
  SELECT c.id, c.title
  FROM "Course" c
)
SELECT 'keep_user' AS item, COUNT(*)::bigint AS total
FROM keep_user
UNION ALL
SELECT 'users_to_delete', COUNT(*)::bigint
FROM users_to_delete
UNION ALL
SELECT 'courses_to_delete', COUNT(*)::bigint
FROM courses_to_delete
UNION ALL
SELECT 'course_assets_to_delete', COUNT(*)::bigint
FROM "CourseAsset"
WHERE "courseId" IN (SELECT id FROM courses_to_delete)
UNION ALL
SELECT 'modules_to_delete', COUNT(*)::bigint
FROM "Module"
WHERE "courseId" IN (SELECT id FROM courses_to_delete)
UNION ALL
SELECT 'lessons_to_delete', COUNT(*)::bigint
FROM "Lesson"
WHERE "moduleId" IN (
  SELECT id FROM "Module" WHERE "courseId" IN (SELECT id FROM courses_to_delete)
)
UNION ALL
SELECT 'lesson_assets_to_delete', COUNT(*)::bigint
FROM "lesson_assets"
WHERE "lesson_id" IN (
  SELECT id FROM "Lesson"
  WHERE "moduleId" IN (
    SELECT id FROM "Module" WHERE "courseId" IN (SELECT id FROM courses_to_delete)
  )
)
UNION ALL
SELECT 'quizzes_to_delete', COUNT(*)::bigint
FROM "Quiz"
WHERE "lessonId" IN (
  SELECT id FROM "Lesson"
  WHERE "moduleId" IN (
    SELECT id FROM "Module" WHERE "courseId" IN (SELECT id FROM courses_to_delete)
  )
)
UNION ALL
SELECT 'quiz_questions_to_delete', COUNT(*)::bigint
FROM "Question"
WHERE "quizId" IN (
  SELECT id FROM "Quiz"
  WHERE "lessonId" IN (
    SELECT id FROM "Lesson"
    WHERE "moduleId" IN (
      SELECT id FROM "Module" WHERE "courseId" IN (SELECT id FROM courses_to_delete)
    )
  )
)
UNION ALL
SELECT 'quiz_results_to_delete', COUNT(*)::bigint
FROM "QuizResult"
WHERE "quizId" IN (
  SELECT id FROM "Quiz"
  WHERE "lessonId" IN (
    SELECT id FROM "Lesson"
    WHERE "moduleId" IN (
      SELECT id FROM "Module" WHERE "courseId" IN (SELECT id FROM courses_to_delete)
    )
  )
)
   OR "userId" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'ai_prompts_to_delete', COUNT(*)::bigint
FROM "AIPrompt"
WHERE "lessonId" IN (
  SELECT id FROM "Lesson"
  WHERE "moduleId" IN (
    SELECT id FROM "Module" WHERE "courseId" IN (SELECT id FROM courses_to_delete)
  )
)
UNION ALL
SELECT 'lesson_progress_to_delete', COUNT(*)::bigint
FROM "LessonProgress"
WHERE "lessonId" IN (
  SELECT id FROM "Lesson"
  WHERE "moduleId" IN (
    SELECT id FROM "Module" WHERE "courseId" IN (SELECT id FROM courses_to_delete)
  )
)
   OR "userId" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'lesson_notes_to_delete', COUNT(*)::bigint
FROM "lesson_notes"
WHERE "lesson_id" IN (
  SELECT id FROM "Lesson"
  WHERE "moduleId" IN (
    SELECT id FROM "Module" WHERE "courseId" IN (SELECT id FROM courses_to_delete)
  )
)
   OR "user_id" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'enrollments_to_delete', COUNT(*)::bigint
FROM "Enrollment"
WHERE "courseId" IN (SELECT id FROM courses_to_delete)
   OR "userId" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'certificates_to_delete', COUNT(*)::bigint
FROM "Certificate"
WHERE "courseId" IN (SELECT id FROM courses_to_delete)
   OR "userId" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'reviews_to_delete', COUNT(*)::bigint
FROM "Review"
WHERE "courseId" IN (SELECT id FROM courses_to_delete)
   OR "userId" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'order_items_to_delete', COUNT(*)::bigint
FROM "OrderItem"
WHERE "courseId" IN (SELECT id FROM courses_to_delete)
   OR "orderId" IN (
     SELECT id FROM "Order" WHERE "userId" IN (SELECT id FROM users_to_delete)
   )
UNION ALL
SELECT 'orders_to_delete', COUNT(*)::bigint
FROM "Order"
WHERE "userId" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'user_subscriptions_to_delete', COUNT(*)::bigint
FROM "UserSubscription"
WHERE "userId" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'team_course_assignments_to_delete', COUNT(*)::bigint
FROM "team_course_assignments"
WHERE "course_id" IN (SELECT id FROM courses_to_delete)
   OR "assigned_to_user_id" IN (SELECT id FROM users_to_delete)
   OR "assigned_by_user_id" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'user_entitlements_to_delete', COUNT(*)::bigint
FROM "user_entitlements"
WHERE "course_id" IN (SELECT id FROM courses_to_delete)
   OR "user_id" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'user_courses_to_delete', COUNT(*)::bigint
FROM "user_courses"
WHERE "course_id" IN (SELECT id FROM courses_to_delete)
   OR "user_id" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'user_wishlists_to_delete', COUNT(*)::bigint
FROM "user_wishlists"
WHERE "course_id" IN (SELECT id FROM courses_to_delete)
   OR "user_id" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'ai_chat_sessions_to_delete', COUNT(*)::bigint
FROM "AIChatSession"
WHERE "courseId" IN (SELECT id FROM courses_to_delete)
   OR "userId" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'user_ai_usage_to_delete', COUNT(*)::bigint
FROM "user_ai_usage"
WHERE "user_id" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'referrals_to_delete', COUNT(*)::bigint
FROM "Referral"
WHERE "referrerId" IN (SELECT id FROM users_to_delete)
   OR "referredId" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'affiliate_conversions_to_delete', COUNT(*)::bigint
FROM "AffiliateConversion"
WHERE "affiliateId" IN (
  SELECT id FROM "Affiliate" WHERE "userId" IN (SELECT id FROM users_to_delete)
)
UNION ALL
SELECT 'affiliate_payouts_to_delete', COUNT(*)::bigint
FROM "AffiliatePayout"
WHERE "affiliateId" IN (
  SELECT id FROM "Affiliate" WHERE "userId" IN (SELECT id FROM users_to_delete)
)
UNION ALL
SELECT 'affiliates_to_delete', COUNT(*)::bigint
FROM "Affiliate"
WHERE "userId" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'blog_comments_to_delete', COUNT(*)::bigint
FROM "BlogComment"
WHERE "userId" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'blog_posts_to_reassign', COUNT(*)::bigint
FROM "BlogPost"
WHERE "authorId" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'team_workspace_members_to_delete', COUNT(*)::bigint
FROM "team_workspace_members"
WHERE "user_id" IN (SELECT id FROM users_to_delete)
   OR "invited_by_id" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'team_workspace_invites_to_delete', COUNT(*)::bigint
FROM "team_workspace_invites"
WHERE "invited_user_id" IN (SELECT id FROM users_to_delete)
   OR "invited_by_id" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'team_workspaces_to_delete', COUNT(*)::bigint
FROM "team_workspaces"
WHERE "owner_user_id" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'email_preferences_to_delete', COUNT(*)::bigint
FROM "email_preferences"
WHERE "user_id" IN (SELECT id FROM users_to_delete)
UNION ALL
SELECT 'audit_logs_to_delete', COUNT(*)::bigint
FROM "AuditLog"
WHERE "actorId" IN (SELECT id FROM users_to_delete)
ORDER BY item;
