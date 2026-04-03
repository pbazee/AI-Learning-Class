"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DollarSign, ArrowRight, Share2, TrendingUp } from "lucide-react";

export function AffiliateSection({ hasJoined = false }: { hasJoined?: boolean }) {
  const [commissionRate, setCommissionRate] = useState<number>(30);

  useEffect(() => {
    fetch("/api/admin/affiliate-program")
      .then((response) => response.json())
      .then((payload) => {
        if (payload?.commissionRate) {
          setCommissionRate(payload.commissionRate);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="section-shell">
      <div className="section-frame">
        <div className="relative overflow-hidden rounded-[32px] bg-primary-blue px-5 py-10 text-[#ffffff] sm:px-8 sm:py-12 lg:px-16 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_55%)]" />
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-4 py-2 text-sm font-semibold text-[#ffffff]">
                <DollarSign className="h-4 w-4" />
                Affiliate Program
              </div>
              <h2 className="text-3xl font-black text-[#ffffff] sm:text-4xl">
                Earn While You Learn
              </h2>
              <p className="mt-4 text-base text-white/88 sm:text-lg">
                Share AI Learning Class with your network and earn <span className="font-bold text-[#ffffff]">{commissionRate}% commission</span>{" "}
                on every sale. Join thousands of affiliates earning passive income while spreading world-class AI education.
              </p>

              <div className="mt-8 grid w-full gap-4 sm:grid-cols-3 sm:gap-6">
                {[
                  { icon: Share2, label: "Share your unique link" },
                  { icon: TrendingUp, label: "Track your performance" },
                  { icon: DollarSign, label: `Earn ${commissionRate}% per sale` },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-white/88">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                      <Icon className="h-4 w-4 text-[#ffffff]" />
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full shrink-0 sm:w-auto">
              <Link
                href={hasJoined ? "/affiliate/dashboard" : "/affiliate"}
                className="group inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-primary-blue shadow-[0_20px_40px_rgba(0,0,0,0.22)] transition-all hover:bg-white/95 sm:w-auto"
              >
                {hasJoined ? "Open Affiliate Dashboard" : "Join Affiliate Program"}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="mt-3 text-center text-xs text-white/70">
                Free to join / No minimum sales
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
