"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, DollarSign, MousePointerClick, TrendingUp, Clock, ExternalLink } from "lucide-react";

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-300",
    approved: "bg-emerald-500/20 text-emerald-300",
    paid: "bg-emerald-500/20 text-emerald-300",
    pending: "bg-amber-500/20 text-amber-300",
    processing: "bg-blue-500/20 text-blue-300",
    suspended: "bg-rose-500/20 text-rose-300",
    rejected: "bg-rose-500/20 text-rose-300",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status] ?? "bg-white/10 text-slate-300"}`}>
      {status}
    </span>
  );
}

export function AffiliatePortal() {
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [program, setProgram] = useState<AffiliateProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("mpesa");
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/affiliate/dashboard");
      const data = await res.json();
      setAffiliate(data.affiliate ?? null);
      setProgram(data.program ?? null);
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

  async function requestPayout() {
    setRequestingPayout(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliate/payout-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: payoutMethod }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Payout request submitted! We'll process it within 3-5 business days.");
        setShowPayoutForm(false);
        fetchDashboard();
      } else {
        setError(data.error ?? "Failed to request payout");
      }
    } catch {
      setError("Failed to submit payout request");
    } finally {
      setRequestingPayout(false);
    }
  }

  function copyLink() {
    if (!affiliate) return;
    const link = `${window.location.origin}/api/affiliate/track?code=${affiliate.affiliateCode}&redirect=/courses`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  const affiliateLink = affiliate
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/affiliate/track?code=${affiliate.affiliateCode}&redirect=/courses`
    : "";

  const canRequestPayout =
    affiliate?.status === "active" &&
    affiliate.pendingPayout >= (program?.minPayout ?? 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-foreground">Affiliate Program</h1>
        <p className="mt-2 text-muted-foreground">
          Earn {program?.commissionRate ?? 20}% commission on every sale you refer.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {successMsg}
        </div>
      )}

      {/* Not applied yet */}
      {!affiliate && (
        <div className="rounded-3xl border border-border bg-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/15">
            <DollarSign className="h-8 w-8 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Join our Affiliate Program</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Share your unique link and earn {program?.commissionRate ?? 20}% commission for every student
            who enrolls. Minimum payout is ${program?.minPayout ?? 10}.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="font-bold text-foreground">{program?.commissionRate ?? 20}%</p>
              <p>Commission per sale</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="font-bold text-foreground">${program?.minPayout ?? 10}</p>
              <p>Minimum payout</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="font-bold text-foreground">{program?.cookieDays ?? 30} days</p>
              <p>Cookie duration</p>
            </div>
          </div>
          <button
            onClick={applyAffiliate}
            disabled={applying || program?.isActive === false}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)] hover:bg-blue-500 disabled:opacity-60 transition-all"
          >
            {applying ? "Applying..." : "Apply to Become an Affiliate"}
          </button>
          {program?.isActive === false && (
            <p className="mt-3 text-sm text-muted-foreground">The affiliate program is currently paused.</p>
          )}
        </div>
      )}

      {/* Applied / Active */}
      {affiliate && (
        <div className="space-y-6">
          {/* Status banner */}
          {affiliate.status === "pending" && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
              <p className="font-semibold text-amber-300">Your application is under review</p>
              <p className="mt-1 text-sm text-amber-200/70">
                We usually review within 24 hours. You will receive an email once your account is activated.
              </p>
            </div>
          )}
          {affiliate.status === "suspended" && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4">
              <p className="font-semibold text-rose-300">Account suspended</p>
              <p className="mt-1 text-sm text-rose-200/70">
                Please contact support for more information.
              </p>
            </div>
          )}

          {/* Stats cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Clicks", value: affiliate.totalClicks, icon: MousePointerClick, color: "text-blue-400" },
              { label: "Conversions", value: affiliate.totalConversions, icon: TrendingUp, color: "text-emerald-400" },
              { label: "Total Earned", value: `$${affiliate.totalEarnings.toFixed(2)}`, icon: DollarSign, color: "text-purple-400" },
              { label: "Pending Payout", value: `$${affiliate.pendingPayout.toFixed(2)}`, icon: Clock, color: "text-amber-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-5">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-current/10 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black text-foreground">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Affiliate link */}
          {affiliate.status === "active" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-3 font-bold text-foreground">Your Affiliate Link</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 overflow-hidden rounded-xl border border-border bg-muted/50 px-4 py-3">
                  <p className="truncate text-sm text-muted-foreground font-mono">{affiliateLink}</p>
                </div>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-all"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <a
                  href={affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/70 transition-all"
                >
                  <ExternalLink className="h-4 w-4" />
                  Test
                </a>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Share this link to earn {program?.commissionRate ?? 20}% on every sale. Cookie lasts {program?.cookieDays ?? 30} days.
              </p>
            </div>
          )}

          {/* Payout request */}
          {affiliate.status === "active" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground">Request Payout</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Available: <strong className="text-emerald-500">${affiliate.pendingPayout.toFixed(2)}</strong>
                    {" / "}
                    Minimum: ${program?.minPayout ?? 10}
                  </p>
                </div>
                <button
                  onClick={() => setShowPayoutForm((v) => !v)}
                  disabled={!canRequestPayout}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {showPayoutForm ? "Cancel" : "Request Payout"}
                </button>
              </div>

              {showPayoutForm && (
                <div className="mt-4 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">Payout Method</label>
                    <select
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none"
                    >
                      <option value="mpesa">M-Pesa</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>
                  <button
                    onClick={requestPayout}
                    disabled={requestingPayout}
                    className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 transition-all"
                  >
                    {requestingPayout ? "Submitting..." : `Request $${affiliate.pendingPayout.toFixed(2)} via ${payoutMethod}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Conversions table */}
          {affiliate.conversions.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <h3 className="font-bold text-foreground">Recent Conversions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Order Amount", "Commission", "Status", "Date"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {affiliate.conversions.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 text-foreground">${c.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-500">${c.commission.toFixed(2)}</td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payout history */}
          {affiliate.payouts.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <h3 className="font-bold text-foreground">Payout History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Amount", "Method", "Status", "Date"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {affiliate.payouts.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-semibold text-emerald-500">${p.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-foreground capitalize">{p.method}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
