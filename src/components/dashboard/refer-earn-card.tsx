"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Gift } from "lucide-react";

type ReferralStats = {
  referralCode?: string;
  earnedDiscountCode?: string | null;
  completedCount: number;
  program?: {
    minReferrals: number;
  };
  referrals: Array<{
    id: string;
    status: string;
    createdAt: string;
    referred?: {
      name?: string | null;
      email?: string | null;
    };
  }>;
};

export function ReferEarnCard() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, []);

  const minReferrals = stats?.program?.minReferrals ?? 5;
  const completedCount = stats?.completedCount ?? 0;
  const progress = Math.min(100, Math.round((completedCount / Math.max(minReferrals, 1)) * 100));
  const referralLink = useMemo(() => {
    if (!stats?.referralCode || typeof window === "undefined") return "";
    return `${window.location.origin}/signup?ref=${encodeURIComponent(stats.referralCode)}`;
  }, [stats?.referralCode]);

  if (!stats) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-base font-bold text-foreground">Refer &amp; Earn</h3>
        <p className="mt-2 text-sm text-muted-foreground">Loading your referral progress...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Gift className="h-4 w-4 text-blue-500" />
        <h3 className="text-base font-bold text-foreground">Refer &amp; Earn</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Share your referral link and unlock rewards when your invited learners join.
      </p>

      <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
        <p className="truncate text-xs text-muted-foreground">{referralLink || "Referral link unavailable"}</p>
        <button
          type="button"
          onClick={() => {
            if (!referralLink) return;
            navigator.clipboard.writeText(referralLink).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            });
          }}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/70"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy Link"}
        </button>
      </div>

      <div className="mt-4">
        <p className="text-xs text-muted-foreground">
          {completedCount} of {minReferrals} referrals completed
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {stats.earnedDiscountCode ? (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <p className="text-xs text-emerald-300">Reward unlocked</p>
          <p className="mt-1 font-mono text-sm font-semibold text-emerald-200">{stats.earnedDiscountCode}</p>
        </div>
      ) : null}

      <Link
        href="/dashboard/referrals"
        className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:underline"
      >
        Open referral dashboard
      </Link>

      <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
        {stats.referrals.length === 0 ? (
          <p className="text-xs text-muted-foreground">No referred users yet.</p>
        ) : (
          stats.referrals.map((referral) => (
            <div key={referral.id} className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-xs font-semibold text-foreground">
                {referral.referred?.name || referral.referred?.email || "Referred user"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {referral.status} • {new Date(referral.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
