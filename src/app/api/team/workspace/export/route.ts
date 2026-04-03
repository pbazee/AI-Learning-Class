import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import { exportTeamWorkspaceCsv } from "@/lib/team-workspace";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const profile = await syncAuthenticatedUser(user);

    if (!profile) {
      return NextResponse.json({ error: "Unable to verify your account." }, { status: 400 });
    }

    const csv = await exportTeamWorkspaceCsv(profile.id);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="team-progress-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error("[team.workspace.export] Unable to export team report.", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to export your team report right now.",
      },
      { status: 500 }
    );
  }
}
