"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, RefreshCw, Settings, ShieldCheck, X } from "lucide-react";
import { AdminButton, AdminCard, AdminPageIntro, AdminStatCard, AdminStatGrid, StatusPill } from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";

type AffiliateProgram = {
  isActive: boolean;
  commissionRate: number;
  minPayout: number;
  cookieDays: number;
  payoutGraceDays: number;
  fraudDetectionEnabled: boolean;
  allowRecurringCommissions: boolean;
};

type Affiliate = {
  id: string;
  affiliateCode: string;
  status: string;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  pendingPayout: number;
  user: { name: string | null; email: string; country?: string | null };
};

type AffiliateConversion = {
  id: string;
  amount: number;
  commission: number;
  status: string;
  fraudStatus: string;
  fraudReason?: string | null;
  eligibleAt?: string | null;
  createdAt: string;
  affiliate: { user: { name: string | null; email: string } };
};

type AffiliatePayout = {
  id: string;
  amount: number;
  method: string;
  status: string;
  notes?: string | null;
  eligibleAt?: string | null;
  processedAt?: string | null;
  destinationDetails?: Record<string, string> | null;
  createdAt: string;
  affiliate: { user: { name: string | null; email: string } };
};

const tabs = ["Overview", "Affiliates", "Conversions", "Payouts"] as const;
type Tab = (typeof tabs)[number];

function tone(value: string): "success" | "warning" | "danger" | "neutral" | "info" {
  if (["active", "approved", "paid", "clear", "reviewed"].includes(value)) return "success";
  if (["pending", "processing"].includes(value)) return "warning";
  if (["flagged", "rejected", "suspended"].includes(value)) return "danger";
  return "info";
}

function payoutDetails(details?: Record<string, string> | null) {
  if (!details) return "No destination details submitted";
  return Object.entries(details).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(" • ");
}

export function AffiliatesManager() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [programForm, setProgramForm] = useState<AffiliateProgram>({
    isActive: true,
    commissionRate: 20,
    minPayout: 10,
    cookieDays: 30,
    payoutGraceDays: 30,
    fraudDetectionEnabled: true,
    allowRecurringCommissions: false,
  });
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [conversions, setConversions] = useState<AffiliateConversion[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [affiliateStatusFilter, setAffiliateStatusFilter] = useState("all");
  const [affiliateQuery, setAffiliateQuery] = useState("");
  const [conversionStatusFilter, setConversionStatusFilter] = useState("all");
  const [conversionFraudFilter, setConversionFraudFilter] = useState("all");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState("all");
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [programRes, affiliatesRes, conversionsRes, payoutsRes] = await Promise.all([
        fetch("/api/admin/affiliate-program"),
        fetch("/api/admin/affiliates"),
        fetch("/api/admin/affiliate-conversions"),
        fetch("/api/admin/affiliate-payouts"),
      ]);
      const [program, affiliateList, conversionList, payoutList] = await Promise.all([
        programRes.json(),
        affiliatesRes.json(),
        conversionsRes.json(),
        payoutsRes.json(),
      ]);

      setProgramForm({
        isActive: program.isActive ?? true,
        commissionRate: program.commissionRate ?? 20,
        minPayout: program.minPayout ?? 10,
        cookieDays: program.cookieDays ?? 30,
        payoutGraceDays: program.payoutGraceDays ?? 30,
        fraudDetectionEnabled: program.fraudDetectionEnabled ?? true,
        allowRecurringCommissions: program.allowRecurringCommissions ?? false,
      });
      setAffiliates(Array.isArray(affiliateList) ? affiliateList : []);
      setConversions(Array.isArray(conversionList) ? conversionList : []);
      setPayouts(Array.isArray(payoutList) ? payoutList : []);
    } catch {
      toast("Failed to load affiliate data.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function saveProgram() {
    try {
      const response = await fetch("/api/admin/affiliate-program", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(programForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to save affiliate settings.");
      toast("Affiliate program settings saved.", "success");
      fetchData();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to save affiliate settings.", "error");
    }
  }

  async function patch(url: string, body: Record<string, string>) {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Request failed.");
    return payload;
  }

  const stats = useMemo(() => ({
    active: affiliates.filter((affiliate) => affiliate.status === "active").length,
    pending: affiliates.filter((affiliate) => affiliate.status === "pending").length,
    flagged: conversions.filter((conversion) => conversion.fraudStatus === "flagged").length,
    payoutQueue: payouts.filter((payout) => ["pending", "approved", "processing"].includes(payout.status)).reduce((sum, payout) => sum + payout.amount, 0),
    totalCommissions: affiliates.reduce((sum, affiliate) => sum + affiliate.totalEarnings, 0),
  }), [affiliates, conversions, payouts]);

  const filteredAffiliates = affiliates.filter((affiliate) => {
    const statusMatch = affiliateStatusFilter === "all" || affiliate.status === affiliateStatusFilter;
    const queryMatch = !affiliateQuery || `${affiliate.user.name} ${affiliate.user.email} ${affiliate.affiliateCode}`.toLowerCase().includes(affiliateQuery.toLowerCase());
    return statusMatch && queryMatch;
  });
  const filteredConversions = conversions.filter((conversion) => (conversionStatusFilter === "all" || conversion.status === conversionStatusFilter) && (conversionFraudFilter === "all" || conversion.fraudStatus === conversionFraudFilter));
  const filteredPayouts = payouts.filter((payout) => payoutStatusFilter === "all" || payout.status === payoutStatusFilter);

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Affiliate Program"
        description="Control growth partnerships, review fraud signals, and manage the full approval-to-payout lifecycle."
        actions={<AdminButton type="button" variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={fetchData}>Refresh</AdminButton>}
      />

      <div className="flex gap-1 rounded-2xl border border-white/10 bg-slate-950/60 p-1">
        {tabs.map((entry) => (
          <button key={entry} type="button" onClick={() => setTab(entry)} className={cn("flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all", tab === entry ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow" : "text-slate-400 hover:text-white")}>
            {entry}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" /></div> : null}

      {!loading && tab === "Overview" ? (
        <div className="space-y-6">
          <AdminStatGrid>
            <AdminStatCard label="Total Affiliates" value={affiliates.length} />
            <AdminStatCard label="Active" value={stats.active} accent="from-emerald-500 to-teal-500" />
            <AdminStatCard label="Pending Review" value={stats.pending} accent="from-amber-500 to-orange-500" />
            <AdminStatCard label="Flagged Conversions" value={stats.flagged} accent="from-rose-500 to-pink-500" />
            <AdminStatCard label="Payout Queue" value={`$${stats.payoutQueue.toFixed(2)}`} accent="from-violet-500 to-fuchsia-500" />
            <AdminStatCard label="Total Commissions" value={`$${stats.totalCommissions.toFixed(2)}`} accent="from-blue-500 to-cyan-500" />
          </AdminStatGrid>

          <AdminCard className="space-y-6 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20"><Settings className="h-5 w-5 text-blue-400" /></div>
              <div>
                <h3 className="font-bold text-white">Program Settings</h3>
                <p className="text-sm text-slate-400">Tune commissions, grace windows, and fraud controls.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button type="button" onClick={() => setProgramForm((current) => ({ ...current, isActive: !current.isActive }))} className={cn("rounded-2xl border px-4 py-4 text-left", programForm.isActive ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-black/40")}>
                <p className="text-sm font-semibold text-white">Program Active</p>
                <p className="mt-2 text-xs text-slate-400">{programForm.isActive ? "Applications are open." : "New applications are paused."}</p>
              </button>
              <button type="button" onClick={() => setProgramForm((current) => ({ ...current, fraudDetectionEnabled: !current.fraudDetectionEnabled }))} className={cn("rounded-2xl border px-4 py-4 text-left", programForm.fraudDetectionEnabled ? "border-blue-500/30 bg-blue-500/10" : "border-white/10 bg-black/40")}>
                <p className="text-sm font-semibold text-white">Fraud Detection</p>
                <p className="mt-2 text-xs text-slate-400">{programForm.fraudDetectionEnabled ? "Suspicious conversions are auto-flagged." : "Manual review only."}</p>
              </button>
              <button type="button" onClick={() => setProgramForm((current) => ({ ...current, allowRecurringCommissions: !current.allowRecurringCommissions }))} className={cn("rounded-2xl border px-4 py-4 text-left", programForm.allowRecurringCommissions ? "border-violet-500/30 bg-violet-500/10" : "border-white/10 bg-black/40")}>
                <p className="text-sm font-semibold text-white">Recurring Commissions</p>
                <p className="mt-2 text-xs text-slate-400">{programForm.allowRecurringCommissions ? "Enabled for recurring billing models." : "Only first purchases are rewarded."}</p>
              </button>
              <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
                <p className="text-sm font-semibold text-white">Grace Window</p>
                <p className="mt-2 text-xs text-slate-400">Payouts release after {programForm.payoutGraceDays} days.</p>
              </div>

              {[
                { key: "commissionRate" as const, label: "Commission Rate (%)", step: "0.1" },
                { key: "minPayout" as const, label: "Minimum Payout ($)", step: "1" },
                { key: "cookieDays" as const, label: "Cookie Window (days)", step: "1" },
                { key: "payoutGraceDays" as const, label: "Grace Period (days)", step: "1" },
              ].map(({ key, label, step }) => (
                <div key={key}>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">{label}</label>
                  <input type="number" step={step} value={programForm[key]} onChange={(event) => setProgramForm((current) => ({ ...current, [key]: Number(event.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-100 outline-none transition-all focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/15" />
                </div>
              ))}
            </div>

            <div className="flex justify-end"><AdminButton onClick={saveProgram}>Save Program Settings</AdminButton></div>
          </AdminCard>
        </div>
      ) : null}

      {!loading && tab === "Affiliates" ? (
        <div className="space-y-4">
          <AdminCard className="grid gap-4 p-5 md:grid-cols-2">
            <input value={affiliateQuery} onChange={(event) => setAffiliateQuery(event.target.value)} placeholder="Search affiliates by name, email, or code" className="rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-100 outline-none" />
            <select value={affiliateStatusFilter} onChange={(event) => setAffiliateStatusFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-100 outline-none">
              <option value="all">All statuses</option><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="rejected">Rejected</option>
            </select>
          </AdminCard>

          <AdminCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 bg-white/5">{["Affiliate", "Code", "Status", "Clicks", "Conversions", "Earnings", "Pending", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{heading}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAffiliates.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No affiliates match the current filters.</td></tr> : null}
                  {filteredAffiliates.map((affiliate) => (
                    <tr key={affiliate.id} className="hover:bg-white/3">
                      <td className="px-4 py-4"><p className="font-semibold text-white">{affiliate.user.name || "—"}</p><p className="text-xs text-slate-400">{affiliate.user.email}</p><p className="mt-1 text-[11px] text-slate-500">{affiliate.user.country || "Unknown country"}</p></td>
                      <td className="px-4 py-4"><code className="rounded-lg bg-white/5 px-2 py-1 text-xs text-cyan-300">{affiliate.affiliateCode}</code></td>
                      <td className="px-4 py-4"><StatusPill tone={tone(affiliate.status)}>{affiliate.status}</StatusPill></td>
                      <td className="px-4 py-4 text-slate-300">{affiliate.totalClicks}</td>
                      <td className="px-4 py-4 text-slate-300">{affiliate.totalConversions}</td>
                      <td className="px-4 py-4 font-semibold text-emerald-400">${affiliate.totalEarnings.toFixed(2)}</td>
                      <td className="px-4 py-4 text-amber-400">${affiliate.pendingPayout.toFixed(2)}</td>
                      <td className="px-4 py-4"><div className="flex flex-wrap gap-2">{affiliate.status !== "active" ? <AdminButton type="button" variant="ghost" icon={<Check className="h-4 w-4 text-emerald-400" />} onClick={async () => { try { await patch(`/api/admin/affiliates/${affiliate.id}/status`, { status: "active" }); toast("Affiliate approved.", "success"); fetchData(); } catch (error) { toast(error instanceof Error ? error.message : "Unable to update affiliate.", "error"); } }}>Approve</AdminButton> : null}{affiliate.status !== "rejected" ? <AdminButton type="button" variant="ghost" icon={<X className="h-4 w-4 text-rose-400" />} onClick={async () => { try { await patch(`/api/admin/affiliates/${affiliate.id}/status`, { status: "rejected" }); toast("Affiliate rejected.", "success"); fetchData(); } catch (error) { toast(error instanceof Error ? error.message : "Unable to update affiliate.", "error"); } }}>Reject</AdminButton> : null}{affiliate.status !== "suspended" ? <AdminButton type="button" variant="ghost" icon={<AlertTriangle className="h-4 w-4 text-amber-400" />} onClick={async () => { try { await patch(`/api/admin/affiliates/${affiliate.id}/status`, { status: "suspended" }); toast("Affiliate suspended.", "success"); fetchData(); } catch (error) { toast(error instanceof Error ? error.message : "Unable to update affiliate.", "error"); } }}>Suspend</AdminButton> : null}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>
      ) : null}

      {!loading && tab === "Conversions" ? (
        <div className="space-y-4">
          <AdminCard className="grid gap-4 p-5 md:grid-cols-2">
            <select value={conversionStatusFilter} onChange={(event) => setConversionStatusFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-100 outline-none">
              <option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="flagged">Flagged</option><option value="rejected">Rejected</option><option value="paid">Paid</option>
            </select>
            <select value={conversionFraudFilter} onChange={(event) => setConversionFraudFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-100 outline-none">
              <option value="all">All fraud states</option><option value="clear">Clear</option><option value="flagged">Flagged</option><option value="reviewed">Reviewed</option>
            </select>
          </AdminCard>

          <AdminCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 bg-white/5">{["Affiliate", "Order", "Commission", "Status", "Fraud", "Eligible", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{heading}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/5">
                  {filteredConversions.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No conversions match the current filters.</td></tr> : null}
                  {filteredConversions.map((conversion) => (
                    <tr key={conversion.id} className="hover:bg-white/3">
                      <td className="px-4 py-4"><p className="font-semibold text-white">{conversion.affiliate.user.name || "—"}</p><p className="text-xs text-slate-400">{conversion.affiliate.user.email}</p></td>
                      <td className="px-4 py-4 text-slate-300">${conversion.amount.toFixed(2)}<p className="text-[11px] text-slate-500">{conversion.createdAt ? new Date(conversion.createdAt).toLocaleDateString() : "—"}</p></td>
                      <td className="px-4 py-4 font-semibold text-emerald-400">${conversion.commission.toFixed(2)}</td>
                      <td className="px-4 py-4"><StatusPill tone={tone(conversion.status)}>{conversion.status}</StatusPill></td>
                      <td className="px-4 py-4"><StatusPill tone={tone(conversion.fraudStatus)}>{conversion.fraudStatus}</StatusPill>{conversion.fraudReason ? <p className="mt-2 max-w-xs text-xs text-rose-300">{conversion.fraudReason}</p> : null}</td>
                      <td className="px-4 py-4 text-slate-300">{conversion.eligibleAt ? new Date(conversion.eligibleAt).toLocaleDateString() : "Immediate"}</td>
                      <td className="px-4 py-4"><div className="flex flex-wrap gap-2">{conversion.status !== "approved" ? <AdminButton type="button" variant="ghost" icon={<Check className="h-4 w-4 text-emerald-400" />} onClick={async () => { try { await patch("/api/admin/affiliate-conversions", { id: conversion.id, status: "approved" }); toast("Conversion approved.", "success"); fetchData(); } catch (error) { toast(error instanceof Error ? error.message : "Unable to update conversion.", "error"); } }}>Approve</AdminButton> : null}{conversion.status !== "flagged" ? <AdminButton type="button" variant="ghost" icon={<ShieldCheck className="h-4 w-4 text-amber-400" />} onClick={async () => { try { await patch("/api/admin/affiliate-conversions", { id: conversion.id, status: "flagged" }); toast("Conversion flagged.", "success"); fetchData(); } catch (error) { toast(error instanceof Error ? error.message : "Unable to update conversion.", "error"); } }}>Flag</AdminButton> : null}{conversion.status !== "rejected" ? <AdminButton type="button" variant="ghost" icon={<X className="h-4 w-4 text-rose-400" />} onClick={async () => { try { await patch("/api/admin/affiliate-conversions", { id: conversion.id, status: "rejected" }); toast("Conversion rejected.", "success"); fetchData(); } catch (error) { toast(error instanceof Error ? error.message : "Unable to update conversion.", "error"); } }}>Reject</AdminButton> : null}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>
      ) : null}

      {!loading && tab === "Payouts" ? (
        <div className="space-y-4">
          <AdminCard className="p-5">
            <select value={payoutStatusFilter} onChange={(event) => setPayoutStatusFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-100 outline-none md:max-w-sm">
              <option value="all">All payouts</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="processing">Processing</option><option value="paid">Paid</option><option value="rejected">Rejected</option>
            </select>
          </AdminCard>

          <AdminCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 bg-white/5">{["Affiliate", "Amount", "Method", "Eligibility", "Status", "Destination", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{heading}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPayouts.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No payouts match the current filters.</td></tr> : null}
                  {filteredPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-white/3">
                      <td className="px-4 py-4"><p className="font-semibold text-white">{payout.affiliate.user.name || "—"}</p><p className="text-xs text-slate-400">{payout.affiliate.user.email}</p></td>
                      <td className="px-4 py-4 font-semibold text-emerald-400">${payout.amount.toFixed(2)}</td>
                      <td className="px-4 py-4"><StatusPill tone="info">{payout.method}</StatusPill></td>
                      <td className="px-4 py-4 text-slate-300">{payout.eligibleAt ? new Date(payout.eligibleAt).toLocaleDateString() : "Immediate"}{payout.processedAt ? <p className="mt-1 text-[11px] text-slate-500">Processed {new Date(payout.processedAt).toLocaleDateString()}</p> : null}</td>
                      <td className="px-4 py-4"><StatusPill tone={tone(payout.status)}>{payout.status}</StatusPill></td>
                      <td className="px-4 py-4 text-xs text-slate-400">{payoutDetails(payout.destinationDetails)}</td>
                      <td className="px-4 py-4"><div className="flex flex-wrap gap-2">{payout.status === "pending" ? <AdminButton type="button" variant="ghost" icon={<Check className="h-4 w-4 text-blue-400" />} onClick={async () => { try { await patch(`/api/admin/affiliate-payouts/${payout.id}`, { status: "approved" }); toast("Payout approved.", "success"); fetchData(); } catch (error) { toast(error instanceof Error ? error.message : "Unable to update payout.", "error"); } }}>Approve</AdminButton> : null}{["pending", "approved"].includes(payout.status) ? <AdminButton type="button" variant="ghost" icon={<RefreshCw className="h-4 w-4 text-amber-400" />} onClick={async () => { try { await patch(`/api/admin/affiliate-payouts/${payout.id}`, { status: "processing" }); toast("Payout moved to processing.", "success"); fetchData(); } catch (error) { toast(error instanceof Error ? error.message : "Unable to update payout.", "error"); } }}>Process</AdminButton> : null}{["approved", "processing"].includes(payout.status) ? <AdminButton type="button" variant="ghost" icon={<Check className="h-4 w-4 text-emerald-400" />} onClick={async () => { try { await patch(`/api/admin/affiliate-payouts/${payout.id}`, { status: "paid" }); toast("Payout marked paid.", "success"); fetchData(); } catch (error) { toast(error instanceof Error ? error.message : "Unable to update payout.", "error"); } }}>Mark Paid</AdminButton> : null}{!["rejected", "paid"].includes(payout.status) ? <AdminButton type="button" variant="ghost" icon={<X className="h-4 w-4 text-rose-400" />} onClick={async () => { try { await patch(`/api/admin/affiliate-payouts/${payout.id}`, { status: "rejected" }); toast("Payout rejected.", "success"); fetchData(); } catch (error) { toast(error instanceof Error ? error.message : "Unable to update payout.", "error"); } }}>Reject</AdminButton> : null}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>
      ) : null}
    </div>
  );
}
