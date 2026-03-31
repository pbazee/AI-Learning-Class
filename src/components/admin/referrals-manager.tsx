"use client";

import { useMemo, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageIntro,
  AdminSelect,
  AdminStatCard,
  AdminStatGrid,
  AdminSwitch,
  FieldLabel,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";

type ProgramState = {
  isActive: boolean;
  minReferrals: number;
  discountType: string;
  discountValue: number;
  discountExpiry: number;
  doubleSidedRewards: boolean;
  friendDiscountType: string;
  friendDiscountValue: number;
  fraudDetectionEnabled: boolean;
};

type ReferralRow = {
  id: string;
  referrerName: string;
  referrerEmail: string;
  referredName: string;
  referredEmail: string;
  status: string;
  fraudStatus: string;
  fraudReason?: string | null;
  createdAt: string;
  rewardIssued: boolean;
  friendRewardCode?: string | null;
  referrerRewardCode?: string | null;
};

export function ReferralsManager({
  initialProgram,
  initialReferrals,
}: {
  initialProgram: ProgramState;
  initialReferrals: ReferralRow[];
}) {
  const [program, setProgram] = useState<ProgramState>(initialProgram);
  const [rows, setRows] = useState<ReferralRow[]>(initialReferrals);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fraudFilter, setFraudFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const statusMatch = statusFilter === "all" || row.status === statusFilter;
      const fraudMatch = fraudFilter === "all" || row.fraudStatus === fraudFilter;
      const queryMatch =
        !query ||
        `${row.referrerName} ${row.referrerEmail} ${row.referredName} ${row.referredEmail}`
          .toLowerCase()
          .includes(query.toLowerCase());
      return statusMatch && fraudMatch && queryMatch;
    });
  }, [fraudFilter, query, rows, statusFilter]);

  const stats = {
    total: rows.length,
    completed: rows.filter((row) => row.status === "completed").length,
    rewardsIssued: rows.filter((row) => row.rewardIssued).length,
    flagged: rows.filter((row) => row.fraudStatus === "flagged").length,
  };

  async function saveProgramSettings() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/referral-program", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(program),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to save referral program.");
      }
      toast("Referral program settings saved.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to save referral program.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function refreshRows() {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (fraudFilter !== "all") params.set("fraudStatus", fraudFilter);
      if (query) params.set("q", query);
      const response = await fetch(`/api/admin/referrals?${params.toString()}`);
      const data = await response.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      setRows(
        list.map((referral: any) => ({
          id: referral.id,
          status: referral.status,
          fraudStatus: referral.fraudStatus ?? "clear",
          fraudReason: referral.fraudReason,
          rewardIssued: Boolean(referral.rewardIssued),
          friendRewardCode: referral.friendRewardCode,
          referrerRewardCode: referral.referrerRewardCode,
          createdAt: referral.createdAt,
          referrerName: referral.referrer?.name || referral.referrer?.email || "Unknown",
          referrerEmail: referral.referrer?.email || "",
          referredName: referral.referred?.name || referral.referred?.email || "Unknown",
          referredEmail: referral.referred?.email || "",
        }))
      );
      toast("Referral activity refreshed.", "success");
    } catch {
      toast("Unable to refresh referrals right now.", "error");
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Referrals"
        description="Configure double-sided rewards, keep fraud checks active, and review every referral event in one premium operations view."
        actions={
          <AdminButton onClick={refreshRows} variant="secondary">
            Refresh
          </AdminButton>
        }
      />

      <AdminCard className="grid gap-5 p-6 lg:grid-cols-3">
        <AdminSwitch
          checked={program.isActive}
          onChange={(value) => setProgram((current) => ({ ...current, isActive: value }))}
          label="Referral Program Active"
          hint="Toggle referral tracking and rewards platform-wide."
        />
        <AdminSwitch
          checked={program.doubleSidedRewards}
          onChange={(value) => setProgram((current) => ({ ...current, doubleSidedRewards: value }))}
          label="Double-Sided Rewards"
          hint="Reward both the advocate and the invited learner."
        />
        <AdminSwitch
          checked={program.fraudDetectionEnabled}
          onChange={(value) => setProgram((current) => ({ ...current, fraudDetectionEnabled: value }))}
          label="Fraud Prevention"
          hint="Flag suspicious domain matches and unusual referral velocity."
        />

        <div>
          <FieldLabel>Minimum Referrals</FieldLabel>
          <AdminInput
            type="number"
            value={String(program.minReferrals)}
            onChange={(event) => setProgram((current) => ({ ...current, minReferrals: Number(event.target.value || 0) }))}
          />
        </div>
        <div>
          <FieldLabel>Your Reward Type</FieldLabel>
          <AdminSelect
            value={program.discountType}
            onChange={(event) => setProgram((current) => ({ ...current, discountType: event.target.value }))}
          >
            <option value="percent">Percent</option>
            <option value="fixed">Fixed Amount</option>
          </AdminSelect>
        </div>
        <div>
          <FieldLabel>Your Reward Value</FieldLabel>
          <AdminInput
            type="number"
            step="0.01"
            value={String(program.discountValue)}
            onChange={(event) => setProgram((current) => ({ ...current, discountValue: Number(event.target.value || 0) }))}
          />
        </div>

        <div>
          <FieldLabel>Friend Reward Type</FieldLabel>
          <AdminSelect
            value={program.friendDiscountType}
            onChange={(event) => setProgram((current) => ({ ...current, friendDiscountType: event.target.value }))}
          >
            <option value="percent">Percent</option>
            <option value="fixed">Fixed Amount</option>
          </AdminSelect>
        </div>
        <div>
          <FieldLabel>Friend Reward Value</FieldLabel>
          <AdminInput
            type="number"
            step="0.01"
            value={String(program.friendDiscountValue)}
            onChange={(event) => setProgram((current) => ({ ...current, friendDiscountValue: Number(event.target.value || 0) }))}
          />
        </div>
        <div>
          <FieldLabel>Reward Expiry (days)</FieldLabel>
          <AdminInput
            type="number"
            value={String(program.discountExpiry)}
            onChange={(event) => setProgram((current) => ({ ...current, discountExpiry: Number(event.target.value || 0) }))}
          />
        </div>

        <div className="lg:col-span-3 flex justify-end">
          <AdminButton onClick={saveProgramSettings} busy={busy}>
            Save Program Settings
          </AdminButton>
        </div>
      </AdminCard>

      <AdminStatGrid>
        <AdminStatCard label="Total Referrals" value={stats.total} />
        <AdminStatCard label="Completed" value={stats.completed} accent="from-emerald-500 to-teal-400" />
        <AdminStatCard label="Rewards Issued" value={stats.rewardsIssued} accent="from-blue-500 to-cyan-400" />
        <AdminStatCard label="Flagged For Review" value={stats.flagged} accent="from-rose-500 to-pink-500" />
      </AdminStatGrid>

      <AdminCard className="p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <FieldLabel>Search</FieldLabel>
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by learner or email"
            />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <AdminSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending_review">Pending review</option>
              <option value="pending">Pending</option>
              <option value="blocked">Blocked</option>
            </AdminSelect>
          </div>
          <div>
            <FieldLabel>Fraud Status</FieldLabel>
            <AdminSelect value={fraudFilter} onChange={(event) => setFraudFilter(event.target.value)}>
              <option value="all">All flags</option>
              <option value="clear">Clear</option>
              <option value="flagged">Flagged</option>
              <option value="reviewed">Reviewed</option>
            </AdminSelect>
          </div>
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {["Referrer", "Invited User", "Status", "Fraud", "Rewards", "Date"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No referral activity matches the current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{row.referrerName}</p>
                      <p className="text-xs text-slate-400">{row.referrerEmail}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{row.referredName}</p>
                      <p className="text-xs text-slate-400">{row.referredEmail}</p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill tone={row.status === "completed" ? "success" : row.status === "pending_review" ? "warning" : "neutral"}>
                        {row.status.replace("_", " ")}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill tone={row.fraudStatus === "flagged" ? "danger" : row.fraudStatus === "reviewed" ? "info" : "success"}>
                        {row.fraudStatus}
                      </StatusPill>
                      {row.fraudReason ? <p className="mt-2 max-w-xs text-xs text-rose-300">{row.fraudReason}</p> : null}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <StatusPill tone={row.rewardIssued ? "success" : "neutral"}>
                          {row.rewardIssued ? "Referrer rewarded" : "Reward pending"}
                        </StatusPill>
                        {row.friendRewardCode || row.referrerRewardCode ? (
                          <p className="max-w-xs text-xs text-slate-400">
                            {[row.friendRewardCode, row.referrerRewardCode].filter(Boolean).join(" • ")}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
