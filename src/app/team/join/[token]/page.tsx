import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AcceptTeamInviteCard } from "@/components/dashboard/AcceptTeamInviteCard";
import { getCurrentUserProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TeamInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const user = await getCurrentUserProfile();
  const { token } = await params;

  if (!user) {
    redirect(`/login?redirect=/team/join/${encodeURIComponent(token)}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <AcceptTeamInviteCard token={token} />
      </main>
      <Footer />
    </div>
  );
}
