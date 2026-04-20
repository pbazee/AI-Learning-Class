// src/app/pricing/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PricingSection } from "@/components/landing/PricingSection";
import { Check, X, HelpCircle } from "lucide-react";
import { getSubscriptionPlans } from "@/lib/data";
import { buildSiteMetadata } from "@/lib/site-server";

const comparison = [
  { feature: "Course access", free: "All free courses", pro: "All courses", teams: "All courses + team access" },
  { feature: "Certificates", free: true, pro: true, teams: true },
  { feature: "Priority support", free: false, pro: true, teams: true },
  { feature: "Early access", free: false, pro: true, teams: true },
  { feature: "Admin dashboard", free: false, pro: false, teams: true },
  { feature: "Progress tracking", free: false, pro: false, teams: true },
];

function FeatureCell({ val }: { val: boolean | string }) {
  if (val === true) return <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  if (val === false) return <X className="mx-auto h-4 w-4 text-slate-300 dark:text-slate-600" />;
  return <span className="text-xs text-foreground">{val}</span>;
}

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata("/pricing", {
    title: "Pricing",
    description:
      "Compare AI GENIUS LAB monthly and yearly plans for individual learners, teams, and organizations.",
  });
}

export default async function PricingPage() {
  const plans = await getSubscriptionPlans();

  return (
    <div className="min-h-screen bg-background">
      <div>
        <PricingSection plans={plans} />

        <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-2xl font-black text-foreground">
            Full Feature <span className="text-primary-blue">Comparison</span>
          </h2>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="w-1/2 px-6 py-4 text-left text-xs font-medium text-muted-foreground">Feature</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground">Free</th>
                    <th className="bg-primary-blue/10 px-4 py-4 text-center text-xs font-semibold text-primary-blue">Pro *</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground">Teams</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {comparison.map((row) => (
                    <tr key={row.feature} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">{row.feature}</td>
                      <td className="px-4 py-3.5 text-center"><FeatureCell val={row.free} /></td>
                      <td className="bg-primary-blue/5 px-4 py-3.5 text-center"><FeatureCell val={row.pro} /></td>
                      <td className="px-4 py-3.5 text-center"><FeatureCell val={row.teams} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-16">
            <h2 className="mb-8 text-center text-2xl font-black text-foreground">
              Frequently Asked <span className="text-primary-blue">Questions</span>
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[
                { q: "Can I switch plans?", a: "Yes - you can move between Free, Pro, and Teams as your needs change." },
                { q: "What payment methods do you accept?", a: "Visa, Mastercard, Amex via Stripe; PayPal; and Paystack for African users (M-Pesa, bank transfer, USSD, NGN/GHS/KES/ZAR)." },
                { q: "What does the Free plan include?", a: "The Free plan includes all free courses and certificates so new learners can start immediately." },
                { q: "What makes Pro different?", a: "Pro unlocks every course plus priority support and early access to new content." },
                { q: "What is included in Teams?", a: "Teams includes everything in Pro, plus the admin dashboard and learner progress tracking for organizations." },
                { q: "Can I still preview lessons?", a: "Yes - preview-enabled lessons can still be sampled before you commit to a paid plan." },
              ].map((faq) => (
                <div key={faq.q} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-blue" />
                    <div>
                      <p className="mb-2 text-sm font-semibold text-foreground">{faq.q}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 text-center">
            <h3 className="mb-3 text-xl font-black text-foreground">Still not sure?</h3>
            <p className="mb-6 text-sm text-muted-foreground">Start with free courses today, then upgrade to Pro or Teams whenever you&apos;re ready.</p>
            <Link
              href="/courses?price=free"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary-blue px-10 py-4 font-bold text-white transition-colors shadow-sm hover:bg-primary-blue/90"
            >
              Start Free Today {"->"}
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
