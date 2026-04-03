"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DollarSign, MousePointerClick, TrendingUp, Clock } from "lucide-react";

type AffiliateProgram = {
  isActive: boolean;
  commissionRate: number;
  minPayout: number;
  cookieDays: number;
};

type AffiliateData = {
  id: string;
  affiliateCode: string;
  status: string;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  pendingPayout: number;
  paidOut: number;
  conversions: Array<{
    id: string;
    amount: number;
    commission: number;
    status: string;
    createdAt: string;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
  }>;
};

export function AffiliatePortal() {
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [program, setProgram] = useState<AffiliateProgram | null>(null);
  const [availablePayout, setAvailablePayout] = useState(0);
  const [heldBalance, setHeldBalance] = useState(0);
  const [hasOpenPayout, setHasOpenPayout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/affiliate/dashboard");
      const data = await res.json();
      setAffiliate(data.affiliate ?? null);
      setProgram(data.program ?? null);
      setAvailablePayout(Number(data.availablePayout ?? 0));
      setHeldBalance(Number(data.heldBalance ?? 0));
      setHasOpenPayout(Boolean(data.hasOpenPayout));
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  async function applyAffiliate() {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliate/apply", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Application submitted! We'll review and activate your account shortly.");
        fetchDashboard();
      } else {
        setError(data.error ?? "Failed to apply");
      }
    } catch {
      setError("Failed to submit application");
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
      </div>
    );
  }

  const canRequestPayout =
    affiliate?.status === "active" &&
    availablePayout >= (program?.minPayout ?? 10) &&
    !hasOpenPayout;

  const commissionRate = program?.commissionRate ?? 30;

  if (affiliate) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-white">Affiliate Program</h1>
          <p className="mt-2 text-white">
            Your full partner workspace now lives in the dedicated dashboard.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-2xl border border-primary-blue/30 bg-primary-blue/10 px-4 py-3 text-sm text-white">
            {successMsg}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Clicks", value: affiliate.totalClicks, icon: MousePointerClick, color: "text-primary-blue" },
            { label: "Conversions", value: affiliate.totalConversions, icon: TrendingUp, color: "text-primary-blue" },
            { label: "Available Payout", value: `$${availablePayout.toFixed(2)}`, icon: DollarSign, color: "text-primary-blue" },
            { label: "In Grace Window", value: `$${heldBalance.toFixed(2)}`, icon: Clock, color: "text-primary-blue" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-current/10 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="mt-1 text-sm text-white">{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-lg font-bold text-white">Open the Affiliate Dashboard</p>
              <p className="mt-2 text-sm leading-6 text-white">
                Generate your link and QR code, manage payout details for M-Pesa, bank, or PayPal,
                and track commission history with the new {commissionRate}% commission dashboard experience.
              </p>
            </div>
            <Link
              href="/affiliate/dashboard"
              className="inline-flex rounded-2xl bg-primary-blue px-6 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90"
            >
              Open Dashboard
            </Link>
          </div>

          {hasOpenPayout || !canRequestPayout ? (
            <div className="mt-5 rounded-2xl border border-primary-blue/20 bg-primary-blue/10 px-4 py-3 text-sm text-white">
              {hasOpenPayout
                ? "You already have a payout request under review."
                : `Payouts unlock once your eligible balance reaches $${(program?.minPayout ?? 10).toFixed(2)}.`}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">Affiliate Program</h1>
        <p className="mt-2 text-white">
          Earn {commissionRate}% commission on every sale you refer.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-2xl border border-primary-blue/30 bg-primary-blue/10 px-4 py-3 text-sm text-white">
          {successMsg}
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-blue/12">
          <DollarSign className="h-8 w-8 text-primary-blue" />
        </div>
        <h2 className="text-xl font-bold text-white">Join our Affiliate Program</h2>
        <p className="mx-auto mt-3 max-w-md text-white">
          Share your unique link and earn {commissionRate}% commission for every student
          who enrolls. Minimum payout is ${program?.minPayout ?? 10}.
        </p>
        <div className="mt-6 grid gap-3 text-sm text-white sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="font-bold text-white">{commissionRate}%</p>
            <p>Commission per sale</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="font-bold text-white">${program?.minPayout ?? 10}</p>
            <p>Minimum payout</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="font-bold text-white">{program?.cookieDays ?? 30} days</p>
            <p>Cookie duration</p>
          </div>
        </div>
        <button
          onClick={applyAffiliate}
          disabled={applying || program?.isActive === false}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-blue px-8 py-4 font-semibold text-white shadow-[0_20px_40px_-10px_rgba(59,130,246,0.45)] transition-all hover:bg-primary-blue/90 disabled:opacity-60 sm:w-auto"
        >
          {applying ? "Applying..." : "Apply to Become an Affiliate"}
        </button>
        {program?.isActive === false && (
          <p className="mt-3 text-sm text-white">The affiliate program is currently paused.</p>
        )}
      </div>
    </div>
  );
}
