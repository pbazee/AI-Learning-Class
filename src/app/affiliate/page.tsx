import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AffiliatePortal } from "@/components/affiliate/AffiliatePortal";
import { redirect } from "next/navigation";
import { DollarSign, Share2, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserProfile, getUserAffiliateStatus } from "@/lib/data";
import { ScrollToTopOnMount } from "@/components/layout/ScrollToTopOnMount";

export const dynamic = "force-dynamic";

const steps = [
  {
    icon: Share2,
    title: "Apply & Get Your Link",
    description: "Apply to join our affiliate program. Once approved, you get a unique tracking link you can share anywhere.",
  },
  {
    icon: TrendingUp,
    title: "Share With Your Audience",
    description: "Post your link on social media, your blog, YouTube, or anywhere your audience hangs out.",
  },
  {
    icon: DollarSign,
    title: "Earn Commissions",
    description: "Earn a generous commission on every sale made through your link. Payouts via M-Pesa, Bank, or PayPal.",
  },
];

export default async function AffiliatePage() {
  const user = await getCurrentUserProfile();
  if (!user) {
    redirect("/login?redirect=/affiliate");
  }

  const [program, affiliateStatus] = await Promise.all([
    prisma.affiliateProgram.findFirst({
      select: {
        commissionRate: true,
      },
    }),
    getUserAffiliateStatus(user.id),
  ]);
  const commissionRate = program?.commissionRate ?? 30;
  const ctaHref = affiliateStatus.hasJoined ? "/affiliate/dashboard" : "#affiliate-application";
  const ctaLabel = affiliateStatus.hasJoined ? "Open Affiliate Dashboard" : "Apply Now";

  return (
    <div className="min-h-screen bg-background">
      <ScrollToTopOnMount />

      <section className="relative overflow-hidden bg-primary-blue pb-16 pt-12 sm:pb-20 sm:pt-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-4 py-2 text-sm font-semibold text-white">
            <DollarSign className="h-4 w-4" />
            Affiliate Program
          </span>
          <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            Earn Money Teaching <span className="text-white/90">AI</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white sm:text-lg">
            Join our affiliate program and earn commissions for every learner you refer to AI Genius Lab.
            Share your passion for AI education and get paid for it with <span className="font-bold text-white">{commissionRate}% commission</span>.
          </p>
          <LinkButton href={ctaHref} label={ctaLabel} />
        </div>
      </section>

      <section className="border-b border-border bg-[#050813] py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-2xl font-bold text-white sm:mb-12">How It Works</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="flex flex-col items-center rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-[0_24px_60px_-42px_rgba(15,23,42,0.85)]">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-blue/12 ring-1 ring-primary-blue/20">
                  <step.icon className="h-8 w-8 text-primary-blue" />
                </div>
                <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-blue text-xs font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-2 font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!affiliateStatus.hasJoined ? (
        <section id="affiliate-application" className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <AffiliatePortal />
          </div>
        </section>
      ) : null}

      <Footer />
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-primary-blue transition hover:bg-white/95 sm:w-auto"
    >
      {label}
    </a>
  );
}

