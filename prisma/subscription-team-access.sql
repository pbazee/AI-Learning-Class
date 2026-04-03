CREATE TABLE IF NOT EXISTS user_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  course_id TEXT NULL REFERENCES "Course"(id) ON DELETE SET NULL,
  team_workspace_id TEXT NULL,
  scope TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  plan_slug TEXT NULL,
  stripe_subscription_id TEXT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_entitlements_user_status_idx
ON user_entitlements (user_id, status, ends_at);

CREATE INDEX IF NOT EXISTS user_entitlements_plan_status_idx
ON user_entitlements (plan_slug, status);

CREATE TABLE IF NOT EXISTS team_workspaces (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  seat_limit INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_workspaces_owner_idx
ON team_workspaces (owner_user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_entitlements_workspace_fk'
  ) THEN
    ALTER TABLE user_entitlements
      ADD CONSTRAINT user_entitlements_workspace_fk
      FOREIGN KEY (team_workspace_id) REFERENCES team_workspaces(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS team_workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  invited_by_id TEXT NULL REFERENCES "User"(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_workspace_members_user_status_idx
ON team_workspace_members (user_id, status);

CREATE TABLE IF NOT EXISTS team_workspace_invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  invited_email TEXT NULL,
  invited_user_id TEXT NULL REFERENCES "User"(id) ON DELETE SET NULL,
  invited_by_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_workspace_invites_workspace_status_idx
ON team_workspace_invites (workspace_id, status);

CREATE INDEX IF NOT EXISTS team_workspace_invites_token_status_idx
ON team_workspace_invites (token, status);

CREATE TABLE IF NOT EXISTS team_course_assignments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  assigned_to_user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  assigned_by_user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, course_id, assigned_to_user_id)
);

CREATE INDEX IF NOT EXISTS team_course_assignments_workspace_user_idx
ON team_course_assignments (workspace_id, assigned_to_user_id);

ALTER TABLE user_courses
  ADD COLUMN IF NOT EXISTS access_source TEXT NULL DEFAULT 'enrollment',
  ADD COLUMN IF NOT EXISTS lifetime_access BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS owned_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS user_courses_access_idx
ON user_courses (user_id, lifetime_access, expires_at, updated_at DESC);

ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_entitlements_self_select" ON user_entitlements;
CREATE POLICY "user_entitlements_self_select"
ON user_entitlements
FOR SELECT
USING ((auth.uid())::text = user_id);

DROP POLICY IF EXISTS "team_workspaces_member_select" ON team_workspaces;
CREATE POLICY "team_workspaces_member_select"
ON team_workspaces
FOR SELECT
USING (
  (auth.uid())::text = owner_user_id
  OR EXISTS (
    SELECT 1
    FROM team_workspace_members twm
    WHERE twm.workspace_id = team_workspaces.id
      AND twm.user_id = (auth.uid())::text
      AND twm.status = 'ACTIVE'
  )
);

DROP POLICY IF EXISTS "team_workspace_members_visible" ON team_workspace_members;
CREATE POLICY "team_workspace_members_visible"
ON team_workspace_members
FOR SELECT
USING (
  (auth.uid())::text = user_id
  OR EXISTS (
    SELECT 1
    FROM team_workspaces tw
    WHERE tw.id = team_workspace_members.workspace_id
      AND tw.owner_user_id = (auth.uid())::text
  )
  OR EXISTS (
    SELECT 1
    FROM team_workspace_members manager
    WHERE manager.workspace_id = team_workspace_members.workspace_id
      AND manager.user_id = (auth.uid())::text
      AND manager.status = 'ACTIVE'
      AND manager.role IN ('OWNER', 'ADMIN')
  )
);

DROP POLICY IF EXISTS "team_workspace_invites_visible" ON team_workspace_invites;
CREATE POLICY "team_workspace_invites_visible"
ON team_workspace_invites
FOR SELECT
USING (
  (auth.uid())::text = invited_user_id
  OR lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(invited_email, ''))
  OR EXISTS (
    SELECT 1
    FROM team_workspaces tw
    WHERE tw.id = team_workspace_invites.workspace_id
      AND tw.owner_user_id = (auth.uid())::text
  )
  OR EXISTS (
    SELECT 1
    FROM team_workspace_members manager
    WHERE manager.workspace_id = team_workspace_invites.workspace_id
      AND manager.user_id = (auth.uid())::text
      AND manager.status = 'ACTIVE'
      AND manager.role IN ('OWNER', 'ADMIN')
  )
);

DROP POLICY IF EXISTS "team_course_assignments_visible" ON team_course_assignments;
CREATE POLICY "team_course_assignments_visible"
ON team_course_assignments
FOR SELECT
USING (
  (auth.uid())::text = assigned_to_user_id
  OR EXISTS (
    SELECT 1
    FROM team_workspaces tw
    WHERE tw.id = team_course_assignments.workspace_id
      AND tw.owner_user_id = (auth.uid())::text
  )
  OR EXISTS (
    SELECT 1
    FROM team_workspace_members manager
    WHERE manager.workspace_id = team_course_assignments.workspace_id
      AND manager.user_id = (auth.uid())::text
      AND manager.status = 'ACTIVE'
      AND manager.role IN ('OWNER', 'ADMIN')
  )
);

DROP POLICY IF EXISTS "user_courses_self_select" ON user_courses;
CREATE POLICY "user_courses_self_select"
ON user_courses
FOR SELECT
USING ((auth.uid())::text = user_id);
