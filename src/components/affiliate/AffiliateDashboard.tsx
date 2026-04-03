"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  AlertTriangle,
  Banknote,
  Check,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Globe,
  LineChart,
  QrCode,
  Share2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/ToastProvider";
import { buildAffiliateTrackingLink, formatPayoutMethodLabel } from "@/lib/growth-utils";
import { cn, formatPrice } from "@/lib/utils";

type DashboardResponse = {
  affiliate: null | {
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
      fraudStatus: string;
      fraudReason?: string | null;
      eligibleAt?: string | null;
      createdAt: string;
    }>;
    payouts: Array<{
      id: string;
      amount: number;
      method: string;
      status: string;
      notes?: string | null;
      eligibleAt?: string | null;
      createdAt: string;
      destinationDetails?: Record<string, string> | null;
    }>;
  };
  program: {
    isActive: boolean;
    commissionRate: number;
    minPayout: number;
    cookieDays: number;
    payoutGraceDays: number;
    fraudDetectionEnabled: boolean;
    allowRecurringCommissions: boolean;
  };
  availablePayout: number;
  heldBalance: number;
  hasOpenPayout: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "active" || value === "approved" || value === "paid"
      ? "bg-primary-blue/10 text-primary-blue"
      : value === "pending" || value === "processing"
        ? "bg-primary-blue/10 text-primary-blue"
        : value === "flagged" || value === "rejected" || value === "suspended"
          ? "bg-rose-100 text-rose-700"
          : "bg-slate-100 text-slate-700";

  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", tone)}>{value.replace("_", " ")}</span>;
}

export function AffiliateDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutMethod, setPayoutMethod] = useState("mpesa");
  const [destinationDetails, setDestinationDetails] = useState({
    mpesaNumber: "",
    accountName: "",
    bankName: "",
    bankAccountNumber: "",
    bankSwift: "",
    paypalEmail: "",
  });
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/affiliate/dashboard");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to load the affiliate dashboard.");
      }
      setData(payload);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to load the affiliate dashboard.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const affiliateLink = useMemo(() => {
    if (!data?.affiliate || typeof window === "undefined") {
      return "";
    }

    return buildAffiliateTrackingLink(window.location.origin, data.affiliate.affiliateCode);
  }, [data?.affiliate]);

  const qrUrl = affiliateLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(affiliateLink)}`
    : "";

  const chartData = useMemo(() => {
    if (!data?.affiliate) {
      return [];
    }

    const monthlyMap = new Map<string, { month: string; commission: number; sales: number }>();

    data.affiliate.conversions
      .slice()
      .reverse()
      .forEach((conversion) => {
        const month = format(new Date(conversion.createdAt), "MMM");
        const current = monthlyMap.get(month) ?? { month, commission: 0, sales: 0 };
        current.commission += conversion.commission;
        current.sales += conversion.amount;
        monthlyMap.set(month, current);
      });

    return Array.from(monthlyMap.values()).slice(-6);
  }, [data?.affiliate]);

  const shareLinks = useMemo(() => {
    if (!affiliateLink) {
      return [];
    }

    const text = encodeURIComponent("Join me on AI Learning Class and explore practical AI training.");
    const url = encodeURIComponent(affiliateLink);

    return [
      { label: "WhatsApp", href: `https://wa.me/?text=${text}%20${url}` },
      { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
      { label: "X", href: `https://twitter.com/intent/tweet?text=${text}&url=${url}` },
      { label: "Email", href: `mailto:?subject=Learn%20AI%20with%20me&body=${text}%20${url}` },
    ];
  }, [affiliateLink]);

  const minimumPayout = data?.program.minPayout ?? 10;
  const canRequestPayout =
    data?.affiliate?.status === "active" &&
    !data?.hasOpenPayout &&
    (data?.availablePayout ?? 0) >= minimumPayout;

  function getMethodPayload() {
    if (payoutMethod === "mpesa") {
      return {
        accountName: destinationDetails.accountName,
        mpesaNumber: destinationDetails.mpesaNumber,
      };
    }

    if (payoutMethod === "bank") {
      return {
        accountName: destinationDetails.accountName,
        bankName: destinationDetails.bankName,
        bankAccountNumber: destinationDetails.bankAccountNumber,
        bankSwift: destinationDetails.bankSwift,
      };
    }

    return {
      accountName: destinationDetails.accountName,
      paypalEmail: destinationDetails.paypalEmail,
    };
  }

  async function requestPayout() {
    setRequestingPayout(true);
    try {
      const response = await fetch("/api/affiliate/payout-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: payoutMethod,
          destinationDetails: getMethodPayload(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to submit the payout request.");
      }

      toast("Payout request submitted successfully.", "success");
      await fetchDashboard();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to submit the payout request.", "error");
    } finally {
      setRequestingPayout(false);
    }
  }

  function copyLink() {
    if (!affiliateLink) return;

    navigator.clipboard.writeText(affiliateLink).then(() => {
      setCopied(true);
      toast("Affiliate link copied.", "success");
      setTimeout(() => setCopied(false), 1800);
    });
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
      </div>
    );
  }

  if (!data.affiliate) {
    return (
      <div className="rounded-[36px] border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-blue">Affiliate Dashboard</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">
          Apply to unlock your partner workspace.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          Once approved, you'll get your own earnings chart, payout controls, QR-enabled link sharing,
          and conversion visibility in one place.
        </p>
        <a
          href="/affiliate"
          className="mt-8 inline-flex rounded-full bg-primary-blue px-5 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90"
        >
          Go To Affiliate Application
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[36px] border border-primary-blue/20 bg-[linear-gradient(135deg,#0f172a_0%,#3B82F6_52%,#0f172a_140%)] p-8 text-white shadow-[0_32px_90px_-45px_rgba(15,23,42,0.85)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Affiliate Dashboard</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Growth, commissions, and payouts in one polished view.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/88">
              Share your AI Learning Class link, monitor performance, and manage payouts with a {data.program.payoutGraceDays}-day payout protection window.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatusBadge value={data.affiliate.status} />
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold">
              {data.program.commissionRate}% commission
            </span>
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold">
              {data.program.cookieDays}-day cookie
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-primary-blue/20 bg-primary-blue p-5 text-white shadow-[0_26px_65px_-40px_rgba(0,86,210,0.85)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">{data.program.commissionRate}% Commission Flow</p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Lead with your link, let the QR do the rest, and collect payouts from one workspace.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-white">
              Your summary metrics stay visible first, your link generator and QR stay front-and-center, and payout requests sit beside clear history so the partner flow feels instant and trustworthy.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              `${data.program.commissionRate}% per referred sale`,
              `${data.program.cookieDays}-day attribution cookie`,
              `${formatPrice(data.program.minPayout)} minimum payout`,
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {data.affiliate.status !== "active" ? (
        <div className="rounded-[30px] border border-primary-blue/20 bg-primary-blue p-5 text-[#ffffff]">
          <p className="font-semibold">Your affiliate account is currently {data.affiliate.status.replace("_", " ")}.</p>
          <p className="mt-2 text-sm text-white/80">
            We'll keep this dashboard live so you can review your profile, but link sharing and payouts unlock once the account is fully active.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Earned", value: formatPrice(data.affiliate.totalEarnings), icon: DollarSign, accent: "text-primary-blue" },
          { label: "Available For Payout", value: formatPrice(data.availablePayout), icon: Wallet, accent: "text-primary-blue" },
          { label: "In Grace Window", value: formatPrice(data.heldBalance), icon: AlertTriangle, accent: "text-primary-blue" },
          { label: "Conversions", value: String(data.affiliate.totalConversions), icon: TrendingUp, accent: "text-primary-blue" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[30px] border border-border bg-card p-5 shadow-sm">
            <stat.icon className={cn("h-5 w-5", stat.accent)} />
            <p className="mt-4 text-3xl font-black tracking-tight text-foreground">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">Link Generator & QR</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Share your link anywhere. The QR code is perfect for slides, posters, and community meetups.
                </p>
              </div>
              <div className="rounded-full bg-primary-blue/10 px-4 py-2 text-xs font-semibold text-primary-blue">
                Code: {data.affiliate.affiliateCode}
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_220px]">
              <div>
                <div className="flex gap-3">
                  <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-muted/30 px-4 py-3">
                    <p className="truncate text-sm text-muted-foreground">{affiliateLink}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary-blue px-4 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {shareLinks.map((shareLink) => (
                    <a
                      key={shareLink.label}
                      href={shareLink.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                    >
                      <Share2 className="h-4 w-4 text-primary-blue" />
                      {shareLink.label}
                    </a>
                  ))}
                  <a
                    href={affiliateLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    <ExternalLink className="h-4 w-4 text-primary-blue" />
                    Test Link
                  </a>
                </div>
              </div>

              <div className="rounded-[28px] border border-border bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">QR Ready</p>
                <div className="mt-4 overflow-hidden rounded-[24px] border border-white bg-white p-3 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="Affiliate QR code" className="mx-auto h-40 w-40 rounded-2xl" />
                </div>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                  <QrCode className="h-4 w-4 text-primary-blue" />
                  Scan to open your affiliate link
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
                <LineChart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Earnings Overview</p>
                <p className="text-sm text-muted-foreground">Recent commission performance and attributed sales.</p>
              </div>
            </div>

            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="affiliateCommission" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      borderColor: "#e2e8f0",
                      background: "#ffffff",
                    }}
                    formatter={(value: number, name) => [
                      name === "commission" ? formatPrice(value) : formatPrice(value),
                      name === "commission" ? "Commission" : "Sales",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fill="url(#affiliateCommission)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24">
          <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Partner Snapshot</p>
                <p className="text-sm text-muted-foreground">Keep the commission story, cookie window, and payout threshold in view.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {[
                { label: "Commission", value: `${data.program.commissionRate}%` },
                { label: "Cookie Window", value: `${data.program.cookieDays} days` },
                { label: "Minimum Payout", value: formatPrice(data.program.minPayout) },
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue">{item.label}</p>
                  <p className="mt-2 text-lg font-black text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
            <p className="text-lg font-bold text-foreground">Request Payout</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Available now: <strong className="text-foreground">{formatPrice(data.availablePayout)}</strong>
              {" / "}
              Held in grace: <strong className="text-foreground">{formatPrice(data.heldBalance)}</strong>
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Method</label>
                <select
                  value={payoutMethod}
                  onChange={(event) => setPayoutMethod(event.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                >
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Account name</label>
                <input
                  value={destinationDetails.accountName}
                  onChange={(event) =>
                    setDestinationDetails((current) => ({ ...current, accountName: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                />
              </div>

              {payoutMethod === "mpesa" ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">M-Pesa number</label>
                  <input
                    value={destinationDetails.mpesaNumber}
                    onChange={(event) =>
                      setDestinationDetails((current) => ({ ...current, mpesaNumber: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                  />
                </div>
              ) : null}

              {payoutMethod === "bank" ? (
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">Bank name</label>
                    <input
                      value={destinationDetails.bankName}
                      onChange={(event) =>
                        setDestinationDetails((current) => ({ ...current, bankName: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">Account number</label>
                    <input
                      value={destinationDetails.bankAccountNumber}
                      onChange={(event) =>
                        setDestinationDetails((current) => ({ ...current, bankAccountNumber: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">Swift / routing code</label>
                    <input
                      value={destinationDetails.bankSwift}
                      onChange={(event) =>
                        setDestinationDetails((current) => ({ ...current, bankSwift: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>
                </div>
              ) : null}

              {payoutMethod === "paypal" ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">PayPal email</label>
                  <input
                    value={destinationDetails.paypalEmail}
                    onChange={(event) =>
                      setDestinationDetails((current) => ({ ...current, paypalEmail: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                  />
                </div>
              ) : null}
            </div>

            {data.hasOpenPayout ? (
              <div className="mt-5 rounded-2xl border border-primary-blue/20 bg-primary-blue/10 px-4 py-3 text-sm text-primary-blue">
                You already have an open payout request under review.
              </div>
            ) : null}

            <button
              type="button"
              onClick={requestPayout}
              disabled={!canRequestPayout || requestingPayout}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {requestingPayout ? "Submitting..." : `Request ${formatPrice(data.availablePayout)} via ${formatPayoutMethodLabel(payoutMethod)}`}
            </button>
          </div>

          <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
            <p className="text-lg font-bold text-foreground">Payout History</p>
            <div className="mt-5 space-y-3">
              {data.affiliate.payouts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No payout requests yet.
                </div>
              ) : (
                data.affiliate.payouts.map((payout) => (
                  <div key={payout.id} className="rounded-[24px] border border-border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{formatPrice(payout.amount)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatPayoutMethodLabel(payout.method)} / {dateFormatter.format(new Date(payout.createdAt))}
                        </p>
                      </div>
                      <StatusBadge value={payout.status} />
                    </div>
                    {payout.eligibleAt ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Eligible: {dateFormatter.format(new Date(payout.eligibleAt))}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
            <p className="text-lg font-bold text-foreground">Recent Conversions</p>
            <div className="mt-5 space-y-3">
              {data.affiliate.conversions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No conversions tracked yet.
                </div>
              ) : (
                data.affiliate.conversions.slice(0, 5).map((conversion) => (
                  <div key={conversion.id} className="rounded-[24px] border border-border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{formatPrice(conversion.commission)} commission</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Sale: {formatPrice(conversion.amount)} / {dateFormatter.format(new Date(conversion.createdAt))}
                        </p>
                      </div>
                      <StatusBadge value={conversion.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge value={conversion.fraudStatus} />
                      {conversion.eligibleAt ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          Eligible {dateFormatter.format(new Date(conversion.eligibleAt))}
                        </span>
                      ) : null}
                    </div>
                    {conversion.fraudReason ? (
                      <p className="mt-3 text-xs text-rose-600">{conversion.fraudReason}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

