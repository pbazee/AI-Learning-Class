import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AffiliateDashboard } from "@/components/affiliate/AffiliateDashboard";
import { getCurrentUserProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AffiliateDashboardPage() {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/login?redirect=/affiliate/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <AffiliateDashboard />
      </main>
      <Footer />
    </div>
  );
}
