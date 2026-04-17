"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Gift,
  Mail,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";

type ReferralStats = {
  referralCode?: string;
  earnedDiscountCode?: string | null;
  completedCount: number;
  pendingReviewCount: number;
  progressRemaining: number;
  program?: {
    minReferrals: number;
    discountType: string;
    discountValue: number;
    discountExpiry: number;
    doubleSidedRewards?: boolean;
    friendDiscountType?: string;
    friendDiscountValue?: number;
  };
  referrals: Array<{
    id: string;
    status: string;
    fraudStatus?: string;
    fraudReason?: string | null;
    rewardIssued?: boolean;
    friendRewardCode?: string | null;
    referrerRewardCode?: string | null;
    createdAt: string;
    referred?: {
      name?: string | null;
      email?: string | null;
    };
  }>;
};

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
    info: "bg-blue-100 text-blue-700",
  };

  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function ReferralsDashboard() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/referrals/stats")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load referral stats."))))
      .then((data) => setStats(data))
      .catch((error) => toast(error instanceof Error ? error.message : "Failed to load referral stats.", "error"));
  }, [toast]);

  const referralLink = useMemo(() => {
    if (!stats?.referralCode || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/signup?ref=${encodeURIComponent(stats.referralCode)}`;
  }, [stats?.referralCode]);

  const shareButtons = useMemo(() => {
    if (!referralLink) {
      return [];
    }

    const message = encodeURIComponent("Join AI Genius Lab with my referral link and start learning practical AI skills.");
    const encodedUrl = encodeURIComponent(referralLink);

    return [
      { label: "WhatsApp", href: `https://wa.me/?text=${message}%20${encodedUrl}` },
      { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
      { label: "X", href: `https://twitter.com/intent/tweet?text=${message}&url=${encodedUrl}` },
      { label: "Email", href: `mailto:?subject=Join%20AI%20Genius%20Lab&body=${message}%20${encodedUrl}` },
    ];
  }, [referralLink]);

  if (!stats) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const progress = Math.min(
    100,
    Math.round((stats.completedCount / Math.max(stats.program?.minReferrals ?? 1, 1)) * 100)
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[36px] border border-primary-blue/20 bg-primary-blue p-8 shadow-[0_30px_80px_-42px_rgba(0,86,210,0.65)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_52%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Referral Dashboard</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
            Share your link and unlock rewards with momentum.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/88">
            Invite other learners, track progress in real time, and monitor reward status with fraud-screened referrals.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Completed Referrals", value: stats.completedCount, icon: Users, tone: "text-blue-600" },
          { label: "Pending Review", value: stats.pendingReviewCount, icon: Sparkles, tone: "text-amber-500" },
          { label: "Next Reward In", value: `${stats.progressRemaining} left`, icon: TrendingUp, tone: "text-violet-600" },
          { label: "Current Reward", value: stats.earnedDiscountCode ? "Unlocked" : "In Progress", icon: Gift, tone: "text-emerald-600" },
        ].map((item) => (
          <div key={item.label} className="rounded-[30px] border border-border bg-card p-5 shadow-sm">
            <item.icon className={cn("h-5 w-5", item.tone)} />
            <p className="mt-4 text-3xl font-black tracking-tight text-foreground">{item.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">Unique Referral Link</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Share this with friends, communities, newsletters, or your learning circle.
                </p>
              </div>
              <Badge tone="info">Code: {stats.referralCode}</Badge>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                {referralLink}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!referralLink) return;
                  navigator.clipboard.writeText(referralLink).then(() => {
                    setCopied(true);
                    toast("Referral link copied.", "success");
                    setTimeout(() => setCopied(false), 1800);
                  });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {shareButtons.map((shareLink) => (
                <a
                  key={shareLink.label}
                  href={shareLink.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <Share2 className="h-4 w-4 text-blue-600" />
                  {shareLink.label}
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Progress Tracker</p>
                <p className="text-sm text-muted-foreground">
                  {stats.completedCount} of {stats.program?.minReferrals ?? 5} completed toward your next milestone.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] bg-slate-950 p-5 text-white">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Milestone</p>
                  <p className="mt-2 text-3xl font-black">{progress}%</p>
                </div>
                <Badge tone="warning">{stats.progressRemaining} remaining</Badge>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-orange-400" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-4 text-sm text-slate-300">
                Reward: {stats.program?.discountValue}
                {stats.program?.discountType === "fixed" ? " USD off" : "% off"} for you
                {stats.program?.doubleSidedRewards
                  ? ` + ${stats.program.friendDiscountValue}${stats.program.friendDiscountType === "fixed" ? " USD" : "%"} for your friend`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
            <p className="text-lg font-bold text-foreground">Reward Status</p>
            {stats.earnedDiscountCode ? (
              <div className="mt-5 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Reward unlocked</p>
                <p className="mt-3 font-mono text-xl font-bold text-emerald-900">{stats.earnedDiscountCode}</p>
                <p className="mt-2 text-sm text-emerald-800">
                  Use this reward during checkout before it expires in {stats.program?.discountExpiry ?? 30} days.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-[28px] border border-dashed border-border p-5 text-sm text-muted-foreground">
                Keep inviting learners to unlock your next referral reward.
              </div>
            )}

            <div className="mt-5 rounded-[28px] border border-border bg-muted/20 p-5">
              <p className="text-sm font-semibold text-foreground">Double-Sided Rewards</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {stats.program?.doubleSidedRewards
                  ? "Enabled. New learners get a welcome incentive as soon as their referral completes."
                  : "Disabled for now."}
              </p>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-600" />
              <p className="text-lg font-bold text-foreground">Referral Activity</p>
            </div>

            <div className="mt-5 space-y-3">
              {stats.referrals.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  No referred learners yet. Share your link to start building progress.
                </div>
              ) : (
                stats.referrals.map((referral) => (
                  <div key={referral.id} className="rounded-[28px] border border-border bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {referral.referred?.name || referral.referred?.email || "Invited learner"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(referral.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={referral.status === "completed" ? "success" : referral.status === "pending_review" ? "warning" : "neutral"}>
                          {referral.status.replace("_", " ")}
                        </Badge>
                        <Badge tone={referral.fraudStatus === "flagged" ? "danger" : "info"}>
                          {referral.fraudStatus || "clear"}
                        </Badge>
                        {referral.rewardIssued ? <Badge tone="success">Reward issued</Badge> : null}
                      </div>
                    </div>
                    {referral.friendRewardCode || referral.referrerRewardCode ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Codes: {[referral.friendRewardCode, referral.referrerRewardCode].filter(Boolean).join(" | ")}
                      </p>
                    ) : null}
                    {referral.fraudReason ? (
                      <p className="mt-3 text-xs text-rose-600">{referral.fraudReason}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <Link
              href="/pricing"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-500"
            >
              View current plans and rewards
              <TrendingUp className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

