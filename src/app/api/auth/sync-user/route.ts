import { NextResponse } from "next/server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await syncAuthenticatedUser(user);

  if (!profile) {
    return NextResponse.json({ error: "Unable to sync authenticated user." }, { status: 400 });
  }

  return NextResponse.json({
    user: {
      id: profile.id,
      email: profile.email,
      role: profile.role,
    },
  });
}
