// src/app/pricing/page.tsx
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PricingSection } from "@/components/landing/PricingSection";
import { Check, X, HelpCircle } from "lucide-react";
import { getSubscriptionPlans } from "@/lib/data";

const comparison = [
  { feature: "Course access", starter: "50+ beginner courses", pro: "All 200+ courses", teams: "All 200+ courses × seats" },
  { feature: "AI Copilot messages", starter: "100/month", pro: "Unlimited", teams: "Unlimited" },
  { feature: "Certificate of completion", starter: true, pro: true, teams: true },
  { feature: "Blockchain cert verification", starter: false, pro: true, teams: true },
  { feature: "Download resources & code", starter: false, pro: true, teams: true },
  { feature: "Live Q&A sessions", starter: false, pro: "Weekly", teams: "Weekly + dedicated" },
  { feature: "1-on-1 AI mentoring", starter: false, pro: true, teams: true },
  { feature: "Career support", starter: false, pro: true, teams: true },
  { feature: "Admin dashboard", starter: false, pro: false, teams: true },
  { feature: "SSO integration", starter: false, pro: false, teams: true },
  { feature: "Compliance reports", starter: false, pro: false, teams: true },
  { feature: "Priority support SLA", starter: false, pro: false, teams: true },
];

function FeatureCell({ val }: { val: boolean | string }) {
  if (val === true) return <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />;
  if (val === false) return <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />;
  return <span className="text-xs text-foreground">{val}</span>;
}

export default async function PricingPage() {
  const plans = await getSubscriptionPlans();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20">
        <PricingSection plans={plans} />

        {/* Feature comparison table */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <h2 className="text-2xl font-black text-foreground text-center mb-10">
            Full Feature <span className="text-blue-600">Comparison</span>
          </h2>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="py-4 px-6 text-left text-xs text-muted-foreground font-medium w-1/2">Feature</th>
                    <th className="py-4 px-4 text-center text-xs text-muted-foreground font-semibold">Starter</th>
                    <th className="py-4 px-4 text-center text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/20">Pro ⭐</th>
                    <th className="py-4 px-4 text-center text-xs text-muted-foreground font-semibold">Teams</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {comparison.map((row) => (
                    <tr key={row.feature} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-6 text-muted-foreground text-xs">{row.feature}</td>
                      <td className="py-3.5 px-4 text-center"><FeatureCell val={row.starter} /></td>
                      <td className="py-3.5 px-4 text-center bg-blue-50/50 dark:bg-blue-950/10"><FeatureCell val={row.pro} /></td>
                      <td className="py-3.5 px-4 text-center"><FeatureCell val={row.teams} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-16">
            <h2 className="text-2xl font-black text-foreground text-center mb-8">
              Frequently Asked <span className="text-blue-600">Questions</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { q: "Can I switch plans?", a: "Yes — upgrade or downgrade anytime. Upgrades take effect immediately; downgrades at the next billing cycle." },
                { q: "What payment methods do you accept?", a: "Visa, Mastercard, Amex via Stripe; PayPal; and Paystack for African users (M-Pesa, bank transfer, USSD, NGN/GHS/KES/ZAR)." },
                { q: "Is there a free trial?", a: "Every plan includes a 14-day money-back guarantee. No questions asked. Plus many courses have free preview lessons." },
                { q: "Do certificates expire?", a: "No — your certificates never expire and include a unique verification code. Pro and Teams plans include blockchain verification." },
                { q: "Can I buy individual courses?", a: "Yes — every course can be purchased individually for lifetime access, in addition to subscription plans." },
                { q: "What is the Teams plan?", a: "Teams gives 10 seats, an admin dashboard with progress tracking, custom learning paths, SSO, and a dedicated account manager." },
              ].map((faq) => (
                <div key={faq.q} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm mb-2">{faq.q}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="mt-16 text-center">
            <h3 className="text-xl font-black text-foreground mb-3">Still not sure?</h3>
            <p className="text-muted-foreground text-sm mb-6">Start for free — no credit card required. Upgrade when you&apos;re ready.</p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-sm"
            >
              Start Free Today →
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
