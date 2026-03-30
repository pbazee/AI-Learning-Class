"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, DollarSign, TrendingUp, CreditCard, Settings, Check, X, Clock, AlertCircle } from "lucide-react";
import { AdminCard, AdminPageIntro, AdminStatGrid, AdminStatCard, StatusPill, AdminButton } from "@/components/admin/ui";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

type AffiliateProgram = {
  isActive: boolean;
  commissionRate: number;
  minPayout: number;
  cookieDays: number;
};

type Affiliate = {
  id: string;
  affiliateCode: string;
  status: string;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  pendingPayout: number;
  paidOut: number;
  createdAt: string;
  user: { name: string | null; email: string };
};

type AffiliateConversion = {
  id: string;
  amount: number;
  commission: number;
  status: string;
  createdAt: string;
  orderId: string | null;
  affiliate: { user: { name: string | null; email: string } };
};

type AffiliatePayout = {
  id: string;
  amount: number;
  method: string;
  status: string;
  notes: string | null;
  createdAt: string;
  affiliate: { user: { name: string | null; email: string } };
};

const tabs = ["Overview", "Affiliates", "Conversions", "Payouts"] as const;
type Tab = (typeof tabs)[number];

function statusTone(s: string): "success" | "warning" | "danger" | "neutral" | "info" {
  if (s === "active" || s === "approved" || s === "paid") return "success";
  if (s === "pending" || s === "processing") return "warning";
  if (s === "suspended" || s === "rejected") return "danger";
  return "neutral";
}

export function AffiliatesManager() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [program, setProgram] = useState<AffiliateProgram | null>(null);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [conversions, setConversions] = useState<AffiliateConversion[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [programForm, setProgramForm] = useState<AffiliateProgram>({
    isActive: true, commissionRate: 20, minPayout: 10, cookieDays: 30,
  });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [progRes, affRes, convRes, payRes] = await Promise.all([
        fetch("/api/admin/affiliate-program"),
        fetch("/api/admin/affiliates"),
        fetch("/api/admin/affiliate-conversions"),
        fetch("/api/admin/affiliate-payouts"),
      ]);
      const [prog, aff, conv, pay] = await Promise.all([
        progRes.json(), affRes.json(), convRes.json(), payRes.json(),
      ]);
      setProgram(prog);
      setProgramForm({
        isActive: prog.isActive ?? true,
        commissionRate: prog.commissionRate ?? 20,
        minPayout: prog.minPayout ?? 10,
        cookieDays: prog.cookieDays ?? 30,
      });
      setAffiliates(Array.isArray(aff) ? aff : []);
      setConversions(Array.isArray(conv) ? conv : []);
      setPayouts(Array.isArray(pay) ? pay : []);
    } catch {
      toast("Failed to load affiliate data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function saveProgram() {
    try {
      const res = await fetch("/api/admin/affiliate-program", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(programForm),
      });
      const data = await res.json();
      if (data.success) {
        toast("Program settings saved", "success");
        fetchData();
      } else {
        toast(data.error ?? "Failed to save", "error");
      }
    } catch {
      toast("Failed to save program settings", "error");
    }
  }

  async function updateAffiliateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/affiliates/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        toast(`Affiliate ${status}`, "success");
        fetchData();
      } else {
        toast(data.error ?? "Failed to update", "error");
      }
    } catch {
      toast("Failed to update affiliate status", "error");
    }
  }

  async function updateConversionStatus(id: string, status: string) {
    try {
      const res = await fetch("/api/admin/affiliate-conversions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        toast(`Conversion ${status}`, "success");
        fetchData();
      } else {
        toast(data.error ?? "Failed", "error");
      }
    } catch {
      toast("Failed to update conversion", "error");
    }
  }

  async function updatePayoutStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/affiliate-payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        toast(`Payout marked as ${status}`, "success");
        fetchData();
      } else {
        toast(data.error ?? "Failed", "error");
      }
    } catch {
      toast("Failed to update payout", "error");
    }
  }

  const totalEarnings = affiliates.reduce((s, a) => s + a.totalEarnings, 0);
  const activeCount = affiliates.filter((a) => a.status === "active").length;
  const pendingCount = affiliates.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Affiliate Program"
        description="Manage affiliates, track conversions, and handle payouts for your referral program."
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-slate-950/60 p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
              tab === t
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        </div>
      )}

      {!loading && tab === "Overview" && (
        <div className="space-y-6">
          <AdminStatGrid>
            <AdminStatCard label="Total Affiliates" value={affiliates.length} />
            <AdminStatCard label="Active Affiliates" value={activeCount} accent="from-emerald-500 to-teal-500" />
            <AdminStatCard label="Pending Review" value={pendingCount} accent="from-amber-500 to-orange-500" />
            <AdminStatCard label="Total Commissions Paid" value={`$${totalEarnings.toFixed(2)}`} accent="from-purple-500 to-pink-500" />
          </AdminStatGrid>

          <AdminCard className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
                <Settings className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Program Settings</h3>
                <p className="text-sm text-slate-400">Configure commission rates and payout rules</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">Status</label>
                <button
                  onClick={() => setProgramForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border px-4 py-3",
                    programForm.isActive ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-black/40"
                  )}
                >
                  <span className={programForm.isActive ? "text-emerald-400" : "text-slate-400"}>
                    {programForm.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className={cn("h-5 w-9 rounded-full transition-all", programForm.isActive ? "bg-emerald-500" : "bg-slate-700")}>
                    <span className={cn("block h-5 w-5 rounded-full bg-white shadow transition-all", programForm.isActive ? "translate-x-4" : "translate-x-0")} />
                  </span>
                </button>
              </div>

              {[
                { key: "commissionRate" as const, label: "Commission Rate (%)", step: "0.1" },
                { key: "minPayout" as const, label: "Min Payout ($)", step: "1" },
                { key: "cookieDays" as const, label: "Cookie Duration (days)", step: "1" },
              ].map(({ key, label, step }) => (
                <div key={key}>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">{label}</label>
                  <input
                    type="number"
                    step={step}
                    value={programForm[key]}
                    onChange={(e) => setProgramForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-100 outline-none transition-all focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/15"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <AdminButton onClick={saveProgram}>Save Program Settings</AdminButton>
            </div>
          </AdminCard>
        </div>
      )}

      {!loading && tab === "Affiliates" && (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {["Affiliate", "Code", "Status", "Clicks", "Conversions", "Earnings", "Pending", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {affiliates.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No affiliates yet</td></tr>
                )}
                {affiliates.map((a) => (
                  <tr key={a.id} className="hover:bg-white/3">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{a.user.name || "—"}</p>
                      <p className="text-xs text-slate-400">{a.user.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <code className="rounded-lg bg-white/5 px-2 py-1 text-xs text-cyan-300">{a.affiliateCode}</code>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill tone={statusTone(a.status)}>{a.status}</StatusPill>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{a.totalClicks}</td>
                    <td className="px-4 py-4 text-slate-300">{a.totalConversions}</td>
                    <td className="px-4 py-4 font-semibold text-emerald-400">${a.totalEarnings.toFixed(2)}</td>
                    <td className="px-4 py-4 text-amber-400">${a.pendingPayout.toFixed(2)}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        {a.status !== "active" && (
                          <AdminButton
                            type="button"
                            variant="ghost"
                            icon={<Check className="h-4 w-4 text-emerald-400" />}
                            onClick={() => updateAffiliateStatus(a.id, "active")}
                          >
                            Approve
                          </AdminButton>
                        )}
                        {a.status !== "suspended" && (
                          <AdminButton
                            type="button"
                            variant="ghost"
                            icon={<X className="h-4 w-4 text-rose-400" />}
                            onClick={() => updateAffiliateStatus(a.id, "suspended")}
                          >
                            Suspend
                          </AdminButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {!loading && tab === "Conversions" && (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {["Affiliate", "Order Amount", "Commission", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {conversions.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No conversions yet</td></tr>
                )}
                {conversions.map((c) => (
                  <tr key={c.id} className="hover:bg-white/3">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{c.affiliate.user.name || "—"}</p>
                      <p className="text-xs text-slate-400">{c.affiliate.user.email}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-300">${c.amount.toFixed(2)}</td>
                    <td className="px-4 py-4 font-semibold text-emerald-400">${c.commission.toFixed(2)}</td>
                    <td className="px-4 py-4">
                      <StatusPill tone={statusTone(c.status)}>{c.status}</StatusPill>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-xs">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        {c.status === "pending" && (
                          <>
                            <AdminButton
                              type="button"
                              variant="ghost"
                              icon={<Check className="h-4 w-4 text-emerald-400" />}
                              onClick={() => updateConversionStatus(c.id, "approved")}
                            >
                              Approve
                            </AdminButton>
                            <AdminButton
                              type="button"
                              variant="ghost"
                              icon={<X className="h-4 w-4 text-rose-400" />}
                              onClick={() => updateConversionStatus(c.id, "rejected")}
                            >
                              Reject
                            </AdminButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {!loading && tab === "Payouts" && (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {["Affiliate", "Amount", "Method", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payouts.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No payout requests yet</td></tr>
                )}
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-white/3">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{p.affiliate.user.name || "—"}</p>
                      <p className="text-xs text-slate-400">{p.affiliate.user.email}</p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-emerald-400">${p.amount.toFixed(2)}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-300 uppercase">
                        {p.method}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill tone={statusTone(p.status)}>{p.status}</StatusPill>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-xs">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        {p.status === "pending" && (
                          <AdminButton
                            type="button"
                            variant="ghost"
                            icon={<Clock className="h-4 w-4 text-amber-400" />}
                            onClick={() => updatePayoutStatus(p.id, "processing")}
                          >
                            Process
                          </AdminButton>
                        )}
                        {(p.status === "pending" || p.status === "processing") && (
                          <AdminButton
                            type="button"
                            variant="ghost"
                            icon={<Check className="h-4 w-4 text-emerald-400" />}
                            onClick={() => updatePayoutStatus(p.id, "paid")}
                          >
                            Mark Paid
                          </AdminButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
