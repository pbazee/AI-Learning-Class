import { redirect } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { LearnerSettingsClient } from "@/components/settings/LearnerSettingsClient";
import { ResetOnboardingButton } from "@/components/onboarding/ResetOnboardingButton";
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
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-8 lg:px-8">
          <LearnerSettingsClient
            initialProfile={{
              email: user.email,
              name: user.name ?? "",
              bio: user.bio ?? "",
              countryCode: findCountryCodeByName(user.country) ?? "",
              countryName: user.country ?? "",
              preferredCurrency: user.preferredCurrency ?? "USD",
              avatarUrl: user.avatarUrl ?? "",
              role: user.role,
              joinedAt: user.createdAt.toISOString(),
            }}
          />
          <div className="mt-6 rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Learning path</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Retake your onboarding quiz and rebuild your personalized course recommendations.
            </p>
            <ResetOnboardingButton className="mt-4 inline-flex rounded-2xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-blue/90">
              Retake learning quiz
            </ResetOnboardingButton>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
