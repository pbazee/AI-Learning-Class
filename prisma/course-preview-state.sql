create or replace function public.get_course_preview_state(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $function$
with viewer as (
  select auth.uid()::text as user_id
),
course_row as (
  select
    c.id,
    c.slug,
    c.title,
    c.price,
    c.currency,
    c."isFree" as is_free,
    c."thumbnailUrl" as thumbnail_url,
    c."previewVideoUrl" as preview_video_url
  from "Course" c
  where c.slug = p_slug
    and c."isPublished" = true
  limit 1
),
preview_lessons as (
  select
    l.id,
    l.title,
    l.type::text as type,
    coalesce(l."assetUrl", l."videoUrl") as source_url,
    l.content,
    l.preview_minutes,
    l.preview_pages,
    l.duration,
    m.title as module_title,
    m."order" as module_order,
    l."order" as lesson_order
  from "Lesson" l
  join "Module" m on m.id = l."moduleId"
  join course_row c on c.id = m."courseId"
  where l."isPreview" = true
  order by m."order" asc, l."order" asc
),
active_catalog_entitlement as (
  select
    ue."plan_slug" as plan_slug,
    ue.scope::text as scope,
    ue."ends_at" as ends_at,
    ue."team_workspace_id" as team_workspace_id,
    case
      when lower(coalesce(ue."plan_slug", '')) = 'teams' then 'team'
      else 'subscription'
    end as access_source
  from user_entitlements ue
  join viewer v on v.user_id is not null and ue."user_id" = v.user_id
  where ue.status = 'ACTIVE'
    and ue."starts_at" <= now()
    and (ue."ends_at" is null or ue."ends_at" >= now())
    and ue.scope in ('ALL_COURSES', 'FREE_COURSES')
  order by
    case when lower(coalesce(ue."plan_slug", '')) = 'teams' then 1 else 0 end desc,
    ue."ends_at" desc nulls last,
    ue."created_at" desc
  limit 1
),
legacy_catalog_entitlement as (
  select
    sp.slug as plan_slug,
    us."currentPeriodEnd" as ends_at,
    case when 'ALL' = any(sp."coursesIncluded") then true else false end as has_all_courses_access,
    case
      when 'ALL' = any(sp."coursesIncluded") or 'FREE' = any(sp."coursesIncluded") then true
      else false
    end as has_free_courses_access,
    case when lower(sp.slug) = 'teams' then 'team' else 'subscription' end as access_source
  from "UserSubscription" us
  join "SubscriptionPlan" sp on sp.id = us."planId"
  join viewer v on v.user_id is not null and us."userId" = v.user_id
  where us.status in ('ACTIVE', 'TRIALING')
    and us."currentPeriodEnd" >= now()
  order by us."currentPeriodEnd" desc, us."createdAt" desc
  limit 1
),
catalog_access as (
  select
    ace.plan_slug,
    ace.ends_at,
    ace.team_workspace_id,
    ace.access_source,
    (ace.scope = 'ALL_COURSES') as has_all_courses_access,
    (ace.scope in ('ALL_COURSES', 'FREE_COURSES')) as has_free_courses_access
  from active_catalog_entitlement ace
  union all
  select
    lce.plan_slug,
    lce.ends_at,
    null::text as team_workspace_id,
    lce.access_source,
    lce.has_all_courses_access,
    lce.has_free_courses_access
  from legacy_catalog_entitlement lce
  where not exists (select 1 from active_catalog_entitlement)
  limit 1
),
course_enrollment as (
  select
    e."courseId" as course_id,
    e."expiresAt" as expires_at
  from "Enrollment" e
  join viewer v on v.user_id is not null and e."userId" = v.user_id
  join course_row c on c.id = e."courseId"
  where e.status in ('ACTIVE', 'COMPLETED')
    and (e."expiresAt" is null or e."expiresAt" >= now())
  limit 1
),
ordered_course_lessons as (
  select
    l.id,
    l.title,
    m."order" as module_order,
    l."order" as lesson_order
  from "Lesson" l
  join "Module" m on m.id = l."moduleId"
  join course_row c on c.id = m."courseId"
  order by m."order" asc, l."order" asc
),
completed_course_lessons as (
  select
    lp."lessonId" as lesson_id
  from "LessonProgress" lp
  join viewer v on v.user_id is not null and lp."userId" = v.user_id
  join ordered_course_lessons ocl on ocl.id = lp."lessonId"
  where lp."isCompleted" = true
),
latest_course_progress as (
  select
    lp."lessonId" as lesson_id
  from "LessonProgress" lp
  join viewer v on v.user_id is not null and lp."userId" = v.user_id
  join ordered_course_lessons ocl on ocl.id = lp."lessonId"
  order by lp."updatedAt" desc
  limit 1
),
first_incomplete_lesson as (
  select
    ocl.id as lesson_id
  from ordered_course_lessons ocl
  left join completed_course_lessons ccl on ccl.lesson_id = ocl.id
  where ccl.lesson_id is null
  order by ocl.module_order asc, ocl.lesson_order asc
  limit 1
),
first_course_lesson as (
  select
    ocl.id as lesson_id
  from ordered_course_lessons ocl
  order by ocl.module_order asc, ocl.lesson_order asc
  limit 1
),
resolved_access as (
  select
    case
      when ce.course_id is not null then true
      when coalesce(ca.has_all_courses_access, false) then true
      when coalesce(ca.has_free_courses_access, false) and (c.is_free or c.price = 0) then true
      else false
    end as has_access,
    case
      when ce.course_id is not null and ce.expires_at is null then
        case when c.is_free or c.price = 0 then 'free_enrollment' else 'purchase' end
      when ce.course_id is not null then coalesce(ca.access_source, 'subscription')
      when coalesce(ca.has_all_courses_access, false)
        or (coalesce(ca.has_free_courses_access, false) and (c.is_free or c.price = 0)) then ca.access_source
      else null
    end as access_source,
    case
      when ce.course_id is not null and ce.expires_at is not null then ce.expires_at
      else ca.ends_at
    end as expires_at
  from course_row c
  left join course_enrollment ce on true
  left join catalog_access ca on true
),
preview_lessons_json as (
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pl.id,
          'title', pl.title,
          'type', pl.type,
          'sourceUrl', pl.source_url,
          'content', pl.content,
          'previewMinutes', pl.preview_minutes,
          'previewPages', pl.preview_pages,
          'duration', pl.duration,
          'moduleTitle', pl.module_title
        )
        order by pl.module_order asc, pl.lesson_order asc
      ),
      '[]'::jsonb
    ) as preview_lessons
  from preview_lessons pl
),
progress_summary as (
  select
    (select count(*) from completed_course_lessons) as completed_lessons,
    (select count(*) from ordered_course_lessons) as total_lessons,
    (select lesson_id from latest_course_progress) as latest_lesson_id,
    (select lesson_id from first_incomplete_lesson) as first_incomplete_lesson_id,
    (select lesson_id from first_course_lesson) as first_lesson_id
)
select
  case
    when exists (select 1 from course_row) then
      jsonb_build_object(
        'courseId', c.id,
        'courseSlug', c.slug,
        'courseTitle', c.title,
        'thumbnailUrl', c.thumbnail_url,
        'previewVideoUrl', c.preview_video_url,
        'coursePrice', c.price,
        'courseCurrency', c.currency,
        'isFreeCourse', c.is_free,
        'previewLessons', plj.preview_lessons,
        'courseAccess',
          case
            when ra.has_access then jsonb_build_object(
              'courseId', c.id,
              'hasAccess', true,
              'statusLabel', case ra.access_source
                when 'team' then 'Team Access'
                when 'subscription' then 'Pro Access'
                when 'purchase' then 'Owned'
                else 'Enrolled'
              end,
              'actionLabel', case
                when ps.latest_lesson_id is not null then 'Continue Learning'
                else 'Go to Classroom'
              end,
              'lessonHref', case
                when coalesce(ps.latest_lesson_id, ps.first_incomplete_lesson_id, ps.first_lesson_id) is not null then
                  '/learn/' || c.slug || '/' || coalesce(ps.latest_lesson_id, ps.first_incomplete_lesson_id, ps.first_lesson_id)
                else '/courses/' || c.slug
              end,
              'progress', case
                when ps.total_lessons > 0 then round((ps.completed_lessons::numeric / ps.total_lessons::numeric) * 100)::int
                else 0
              end,
              'completedLessons', coalesce(ps.completed_lessons, 0),
              'totalLessons', coalesce(ps.total_lessons, 0),
              'lastLessonTitle', null,
              'accessSource', ra.access_source,
              'expiresAt', case
                when ra.expires_at is not null then to_char(ra.expires_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                else null
              end
            )
            else null
          end
      )
    else null
  end
from course_row c
cross join preview_lessons_json plj
cross join resolved_access ra
cross join progress_summary ps;
$function$;

grant execute on function public.get_course_preview_state(text) to anon, authenticated, service_role;
