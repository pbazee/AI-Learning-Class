import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ReferralsDashboard } from "@/components/dashboard/ReferralsDashboard";
import { getCurrentUserProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardReferralsPage() {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/login?redirect=/dashboard/referrals");
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-12 lg:px-8">
        <ReferralsDashboard />
      </main>
      <Footer />
    </div>
  );
}
