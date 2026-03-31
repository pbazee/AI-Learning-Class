"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Mail,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageIntro,
  AdminSelect,
  AdminStatCard,
  AdminStatGrid,
  FieldLabel,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";
import { cn, formatPrice } from "@/lib/utils";

type SubscriptionRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userCountry: string;
  planName: string;
  planCurrency: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  revenue: number;
  lastActiveAt?: string | null;
  coursesIncluded: string[];
};

type SortKey =
  | "userName"
  | "planName"
  | "status"
  | "currentPeriodEnd"
  | "revenue"
  | "userCountry"
  | "lastActiveAt";

const pageSizeOptions = [10, 20, 50];
const bulkEmailTemplates = [
  { value: "renewal_reminder", label: "Renewal reminder" },
  { value: "inactive_reactivation", label: "Inactive reactivation" },
  { value: "expiry_warning", label: "Expiry warning" },
];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function statusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "TRIALING") return "info";
  if (status === "PAST_DUE") return "warning";
  if (status === "CANCELLED") return "danger";
  return "neutral";
}

function compareValue(left: string | number, right: string | number) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, { sensitivity: "base" });
}

function daysUntil(dateString?: string | null) {
  if (!dateString) return Number.NEGATIVE_INFINITY;

  const target = new Date(dateString).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / 86400000);
}

function isInactive(lastActiveAt?: string | null) {
  if (!lastActiveAt) {
    return true;
  }

  return daysUntil(lastActiveAt) < -21;
}

function serializeCsv(rows: SubscriptionRow[]) {
  const headers = [
    "Name",
    "Email",
    "Country",
    "Plan",
    "Status",
    "Billing Cycle",
    "Revenue",
    "Current Period Start",
    "Current Period End",
    "Last Active At",
    "Courses Included",
  ];

  const escapeCell = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const lines = rows.map((row) =>
    [
      row.userName,
      row.userEmail,
      row.userCountry,
      row.planName,
      row.status,
      row.billingCycle,
      row.revenue.toFixed(2),
      row.currentPeriodStart,
      row.currentPeriodEnd,
      row.lastActiveAt ?? "",
      row.coursesIncluded.join(" | "),
    ]
      .map(escapeCell)
      .join(",")
  );

  return [headers.map(escapeCell).join(","), ...lines].join("\n");
}

export function UserSubscriptionsManager({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("currentPeriodEnd");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [emailTemplate, setEmailTemplate] = useState("renewal_reminder");
  const [isEmailing, startEmailTransition] = useTransition();
  const { toast } = useToast();

  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const availablePlans = useMemo(
    () => Array.from(new Set(subscriptions.map((subscription) => subscription.planName))).sort(),
    [subscriptions]
  );
  const availableCountries = useMemo(
    () =>
      Array.from(
        new Set(
          subscriptions
            .map((subscription) => subscription.userCountry)
            .filter((country) => country && country !== "Unknown")
        )
      ).sort((left, right) => left.localeCompare(right)),
    [subscriptions]
  );

  const filteredSubscriptions = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const nextRows = subscriptions.filter((subscription) => {
      const matchesQuery =
        !normalizedQuery ||
        `${subscription.userName} ${subscription.userEmail} ${subscription.planName} ${subscription.userCountry}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || subscription.status === statusFilter;
      const matchesPlan = planFilter === "all" || subscription.planName === planFilter;
      const matchesCountry = countryFilter === "all" || subscription.userCountry === countryFilter;
      const expiryWindow = Number(expiryFilter);
      const remainingDays = daysUntil(subscription.currentPeriodEnd);
      const matchesExpiry =
        expiryFilter === "all"
          ? true
          : remainingDays >= 0 && remainingDays <= expiryWindow;

      return matchesQuery && matchesStatus && matchesPlan && matchesCountry && matchesExpiry;
    });

    nextRows.sort((left, right) => {
      const leftValue =
        sortKey === "lastActiveAt"
          ? left.lastActiveAt ? new Date(left.lastActiveAt).getTime() : 0
          : sortKey === "currentPeriodEnd"
            ? new Date(left.currentPeriodEnd).getTime()
            : left[sortKey];
      const rightValue =
        sortKey === "lastActiveAt"
          ? right.lastActiveAt ? new Date(right.lastActiveAt).getTime() : 0
          : sortKey === "currentPeriodEnd"
            ? new Date(right.currentPeriodEnd).getTime()
            : right[sortKey];

      const comparison = compareValue(leftValue as string | number, rightValue as string | number);
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return nextRows;
  }, [
    countryFilter,
    deferredQuery,
    expiryFilter,
    planFilter,
    sortDirection,
    sortKey,
    statusFilter,
    subscriptions,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredSubscriptions.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const currentPageRows = filteredSubscriptions.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedRows = filteredSubscriptions.filter((subscription) => selectedIds.includes(subscription.id));

  const stats = useMemo(() => {
    const active = subscriptions.filter((subscription) =>
      ["ACTIVE", "TRIALING"].includes(subscription.status)
    );
    const expiringSoon = subscriptions.filter((subscription) => {
      const remainingDays = daysUntil(subscription.currentPeriodEnd);
      return remainingDays >= 0 && remainingDays <= 7 && ["ACTIVE", "TRIALING"].includes(subscription.status);
    });
    const inactive = subscriptions.filter((subscription) => isInactive(subscription.lastActiveAt));
    const atRisk = subscriptions.filter((subscription) => subscription.status === "PAST_DUE");

    return {
      active: active.length,
      expiringSoon: expiringSoon.length,
      inactive: inactive.length,
      atRisk: atRisk.length,
      mrr: active.reduce((sum, subscription) => {
        const monthlyValue =
          subscription.billingCycle.toLowerCase() === "yearly"
            ? subscription.revenue / 12
            : subscription.revenue;
        return sum + monthlyValue;
      }, 0),
    };
  }, [subscriptions]);

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  }

  function toggleCurrentPageSelection() {
    const pageIds = currentPageRows.map((row) => row.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

    setSelectedIds((current) =>
      allSelected ? current.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...current, ...pageIds]))
    );
  }

  function exportCsv() {
    const csv = serializeCsv(filteredSubscriptions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "user-subscriptions.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast("CSV export generated successfully.", "success");
  }

  function sendBulkEmail() {
    if (selectedRows.length === 0) {
      toast("Select at least one subscriber first.", "error");
      return;
    }

    startEmailTransition(async () => {
      try {
        const response = await fetch("/api/admin/user-subscriptions/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscriptionIds: selectedRows.map((row) => row.id),
            template: emailTemplate,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Unable to send bulk email.");
        }

        toast(payload?.message || "Bulk email sent successfully.", "success");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Unable to send bulk email.", "error");
      }
    });
  }

  function SortButton({ label, column }: { label: string; column: SortKey }) {
    const active = sortKey === column;

    return (
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 transition-colors hover:text-white"
      >
        {label}
        {active ? (
          sortDirection === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : null}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Revenue"
        title="User Subscriptions"
        description="Filter renewal risk, spot inactivity, trigger bulk lifecycle emails, and export the exact subscriber segment you need."
        actions={
          <>
            <AdminButton type="button" variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportCsv}>
              Export CSV
            </AdminButton>
            <AdminButton
              type="button"
              icon={isEmailing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              onClick={sendBulkEmail}
              disabled={selectedRows.length === 0}
            >
              Email Selected
            </AdminButton>
          </>
        }
      />

      <AdminStatGrid>
        <AdminStatCard label="Active Access" value={stats.active} />
        <AdminStatCard label="Expiring In 7 Days" value={stats.expiringSoon} accent="from-amber-500 to-orange-400" />
        <AdminStatCard label="Inactive Learners" value={stats.inactive} accent="from-violet-500 to-fuchsia-400" />
        <AdminStatCard label="Past Due" value={stats.atRisk} accent="from-rose-500 to-pink-500" />
        <AdminStatCard label="Monthly Recurring Revenue" value={formatPrice(stats.mrr)} accent="from-blue-500 to-cyan-400" />
      </AdminStatGrid>

      <AdminCard className="p-5">
        <div className="grid gap-4 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <AdminInput
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, country"
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <AdminSelect value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIALING">Trialing</option>
              <option value="PAST_DUE">Past due</option>
              <option value="CANCELLED">Cancelled</option>
            </AdminSelect>
          </div>
          <div>
            <FieldLabel>Plan</FieldLabel>
            <AdminSelect value={planFilter} onChange={(event) => { setPlanFilter(event.target.value); setPage(1); }}>
              <option value="all">All plans</option>
              {availablePlans.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </AdminSelect>
          </div>
          <div>
            <FieldLabel>Expiry</FieldLabel>
            <AdminSelect value={expiryFilter} onChange={(event) => { setExpiryFilter(event.target.value); setPage(1); }}>
              <option value="all">Any renewal window</option>
              <option value="7">Next 7 days</option>
              <option value="14">Next 14 days</option>
              <option value="30">Next 30 days</option>
            </AdminSelect>
          </div>
          <div>
            <FieldLabel>Country</FieldLabel>
            <AdminSelect value={countryFilter} onChange={(event) => { setCountryFilter(event.target.value); setPage(1); }}>
              <option value="all">All countries</option>
              {availableCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </AdminSelect>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_auto]">
          <div>
            <FieldLabel>Bulk Email Template</FieldLabel>
            <AdminSelect value={emailTemplate} onChange={(event) => setEmailTemplate(event.target.value)}>
              {bulkEmailTemplates.map((template) => (
                <option key={template.value} value={template.value}>
                  {template.label}
                </option>
              ))}
            </AdminSelect>
          </div>
          <div>
            <FieldLabel>Rows per page</FieldLabel>
            <AdminSelect
              value={String(pageSize)}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </AdminSelect>
          </div>
          <div className="flex items-end">
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-400">
              {selectedRows.length} selected • {filteredSubscriptions.length} filtered
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={currentPageRows.length > 0 && currentPageRows.every((row) => selectedIds.includes(row.id))}
                    onChange={toggleCurrentPageSelection}
                  />
                </th>
                <th className="px-4 py-3 text-left"><SortButton label="Subscriber" column="userName" /></th>
                <th className="px-4 py-3 text-left"><SortButton label="Plan" column="planName" /></th>
                <th className="px-4 py-3 text-left"><SortButton label="Status" column="status" /></th>
                <th className="px-4 py-3 text-left"><SortButton label="Revenue" column="revenue" /></th>
                <th className="px-4 py-3 text-left"><SortButton label="Renews" column="currentPeriodEnd" /></th>
                <th className="px-4 py-3 text-left"><SortButton label="Country" column="userCountry" /></th>
                <th className="px-4 py-3 text-left"><SortButton label="Last Active" column="lastActiveAt" /></th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {currentPageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                    No subscriptions match the current filters.
                  </td>
                </tr>
              ) : (
                currentPageRows.map((subscription) => {
                  const renewalDays = daysUntil(subscription.currentPeriodEnd);
                  const inactive = isInactive(subscription.lastActiveAt);

                  return (
                    <tr key={subscription.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(subscription.id)}
                          onChange={() => toggleSelection(subscription.id)}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-white">{subscription.userName}</p>
                          <p className="mt-1 text-xs text-slate-400">{subscription.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">{subscription.planName}</p>
                        <p className="mt-1 text-xs capitalize text-slate-400">{subscription.billingCycle}</p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill tone={statusTone(subscription.status)}>{subscription.status.replace("_", " ")}</StatusPill>
                      </td>
                      <td className="px-4 py-4 font-semibold text-white">
                        {formatPrice(subscription.revenue, subscription.planCurrency)}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-200">{dateFormatter.format(new Date(subscription.currentPeriodEnd))}</p>
                        <p className={cn("mt-1 text-xs", renewalDays <= 7 ? "text-amber-300" : "text-slate-500")}>
                          {renewalDays >= 0 ? `${renewalDays} day${renewalDays === 1 ? "" : "s"} left` : "Expired"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-300">{subscription.userCountry}</td>
                      <td className="px-4 py-4">
                        <p className="text-slate-300">
                          {subscription.lastActiveAt
                            ? dateFormatter.format(new Date(subscription.lastActiveAt))
                            : "No activity"}
                        </p>
                        <p className={cn("mt-1 text-xs", inactive ? "text-rose-300" : "text-slate-500")}>
                          {inactive ? "Inactive" : "Engaged recently"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-sm flex-wrap gap-2">
                          {subscription.coursesIncluded.slice(0, 3).map((course) => (
                            <span
                              key={`${subscription.id}-${course}`}
                              className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300"
                            >
                              {course}
                            </span>
                          ))}
                          {subscription.coursesIncluded.length > 3 ? (
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">
                              +{subscription.coursesIncluded.length - 3} more
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Showing {filteredSubscriptions.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-
            {Math.min(safePage * pageSize, filteredSubscriptions.length)} of {filteredSubscriptions.length} subscriptions
          </p>
          <div className="flex items-center gap-2">
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </AdminButton>
            <div className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-300">
              Page {safePage} of {pageCount}
            </div>
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => setPage((current) => Math.min(current + 1, pageCount))}
              disabled={safePage === pageCount}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </AdminButton>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
