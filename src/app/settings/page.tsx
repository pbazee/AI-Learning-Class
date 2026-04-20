import { redirect } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { LearnerSettingsClient } from "@/components/settings/LearnerSettingsClient";
import { findCountryCodeByName } from "@/lib/countries";
import { getCurrentUserProfile } from "@/lib/data";

export default async function SettingsPage() {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/login?redirect=/settings");
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <LearnerSettingsClient
            initialProfile={{
              email: user.email,
              name: user.name ?? "",
              bio: user.bio ?? "",
              countryCode: findCountryCodeByName(user.country) ?? "",
              countryName: user.country ?? "",
              preferredCurrency: user.preferredCurrency ?? "USD",
              role: user.role,
              joinedAt: user.createdAt.toISOString(),
            }}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
