import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TeamWorkspaceDashboard } from "@/components/dashboard/TeamWorkspaceDashboard";
import { getCurrentUserProfile } from "@/lib/data";
import { getTeamWorkspaceDashboardData } from "@/lib/team-workspace";

export const dynamic = "force-dynamic";

export default async function TeamsDashboardPage() {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/login?redirect=/dashboard/teams");
  }

  const data = await getTeamWorkspaceDashboardData(user.id);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {data ? (
          <TeamWorkspaceDashboard initialData={data} />
        ) : (
          <div className="rounded-[36px] border border-border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-blue/10 text-primary-blue">
              <Users className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black text-foreground">No active Teams workspace yet</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Upgrade to Teams to unlock member invites, progress analytics, bulk assignments, and CSV exports in one workspace.
            </p>
            <Link
              href="/checkout?plan=teams"
              className="mt-8 inline-flex items-center rounded-2xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90"
            >
              Upgrade to Teams
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
