import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import {
  acceptTeamWorkspaceInvite,
  bulkAssignCoursesToTeamMembers,
  createTeamWorkspaceInvite,
  getTeamWorkspaceDashboardData,
  revokeTeamWorkspaceInvite,
  revokeTeamWorkspaceMember,
} from "@/lib/team-workspace";

async function getAuthenticatedProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return syncAuthenticatedUser(user);
}

export async function GET() {
  try {
    const profile = await getAuthenticatedProfile();

    if (!profile) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const data = await getTeamWorkspaceDashboardData(profile.id);

    if (!data) {
      return NextResponse.json(
        { error: "You do not have an active Teams admin workspace." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[team.workspace] Unable to load workspace dashboard.", error);
    return NextResponse.json(
      { error: "Unable to load your Teams workspace right now." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getAuthenticatedProfile();

    if (!profile) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "createInvite") {
      const email = typeof body.email === "string" ? body.email : null;
      const invite = await createTeamWorkspaceInvite(profile.id, email);
      return NextResponse.json({ invite });
    }

    if (action === "revokeInvite") {
      const inviteId = typeof body.inviteId === "string" ? body.inviteId : "";

      if (!inviteId) {
        return NextResponse.json({ error: "Missing invite id." }, { status: 400 });
      }

      await revokeTeamWorkspaceInvite(profile.id, inviteId);
      return NextResponse.json({ success: true });
    }

    if (action === "revokeMember") {
      const memberId = typeof body.memberId === "string" ? body.memberId : "";

      if (!memberId) {
        return NextResponse.json({ error: "Missing member id." }, { status: 400 });
      }

      await revokeTeamWorkspaceMember(profile.id, memberId);
      return NextResponse.json({ success: true });
    }

    if (action === "bulkAssign") {
      const courseIds = Array.isArray(body.courseIds)
        ? body.courseIds.filter((value: unknown): value is string => typeof value === "string")
        : [];
      const memberIds = Array.isArray(body.memberIds)
        ? body.memberIds.filter((value: unknown): value is string => typeof value === "string")
        : [];

      await bulkAssignCoursesToTeamMembers(profile.id, { courseIds, memberIds });
      return NextResponse.json({ success: true });
    }

    if (action === "acceptInvite") {
      const token = typeof body.token === "string" ? body.token : "";

      if (!token) {
        return NextResponse.json({ error: "Missing invite token." }, { status: 400 });
      }

      const result = await acceptTeamWorkspaceInvite(profile.id, token);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Choose a valid workspace action." }, { status: 400 });
  } catch (error) {
    console.error("[team.workspace] Workspace action failed.", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete that Teams action right now.",
      },
      { status: 500 }
    );
  }
}
