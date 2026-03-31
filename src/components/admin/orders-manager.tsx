"use client";

import { startTransition, useMemo, useState } from "react";
import {
  ArrowUpDown,
  CalendarRange,
  Download,
  Eye,
  Mail,
  Package,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { grantOrderAccessAction, refundOrderAction } from "@/app/admin/actions";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminModal,
  AdminPageIntro,
  AdminSelect,
  AdminStatCard,
  AdminStatGrid,
  FieldLabel,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";

export type AdminOrderStatus = "Paid" | "Pending" | "Refunded" | "Cancelled";

export type AdminOrderRecord = {
  id: string;
  kind: "course_order" | "subscription";
  sourceStatus: string;
  customerName: string;
  customerEmail: string;
  customerCountry?: string | null;
  itemSummary: string;
  itemLabels: string[];
  amount: number;
  currency: string;
  status: AdminOrderStatus;
  createdAt: string;
  updatedAt: string;
  paymentMethod: string;
  paymentReference?: string | null;
  receiptUrl?: string | null;
  billingCycle?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  courseItems: Array<{
    courseId: string;
    title: string;
    price: number;
    hasAccess: boolean;
  }>;
  actions: {
    canRefund: boolean;
    canGrantAccess: boolean;
  };
  statusHistory: Array<{
    label: string;
    timestamp: string;
    detail: string;
  }>;
};

type SortKey = "id" | "customer" | "item" | "amount" | "status" | "date";

const pageSize = 10;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusTone(status: AdminOrderStatus): "success" | "warning" | "info" | "danger" {
  switch (status) {
    case "Paid":
      return "success";
    case "Pending":
      return "warning";
    case "Refunded":
      return "info";
    default:
      return "danger";
  }
}

function csvEscape(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export function OrdersManager({ orders }: { orders: AdminOrderRecord[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | AdminOrderStatus>("all");
  const [itemFilter, setItemFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"refund" | "grant" | null>(null);

  const itemOptions = useMemo(
    () =>
      Array.from(new Set(orders.flatMap((order) => order.itemLabels).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right)
      ),
    [orders]
  );

  const stats = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === "Paid");
    const paidRevenue = paidOrders.reduce((sum, order) => sum + order.amount, 0);
    const refundedCount = orders.filter((order) => order.status === "Refunded").length;

    return {
      totalRevenue: paidRevenue,
      totalOrders: orders.length,
      pendingRefunds: refundedCount,
      averageOrderValue: paidOrders.length > 0 ? paidRevenue / paidOrders.length : 0,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    const startBoundary = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const endBoundary = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesItem = itemFilter === "all" || order.itemLabels.includes(itemFilter);
      const matchesSearch =
        normalizedQuery.length === 0 ||
        order.id.toLowerCase().includes(normalizedQuery) ||
        order.customerName.toLowerCase().includes(normalizedQuery) ||
        order.customerEmail.toLowerCase().includes(normalizedQuery) ||
        order.itemSummary.toLowerCase().includes(normalizedQuery);
      const matchesStart = !startBoundary || createdAt >= startBoundary;
      const matchesEnd = !endBoundary || createdAt <= endBoundary;

      return matchesStatus && matchesItem && matchesSearch && matchesStart && matchesEnd;
    });
  }, [endDate, itemFilter, orders, search, startDate, statusFilter]);

  const sortedOrders = useMemo(() => {
    const rows = [...filteredOrders];

    rows.sort((left, right) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;

      switch (sortKey) {
        case "id":
          return left.id.localeCompare(right.id) * multiplier;
        case "customer":
          return left.customerName.localeCompare(right.customerName) * multiplier;
        case "item":
          return left.itemSummary.localeCompare(right.itemSummary) * multiplier;
        case "amount":
          return (left.amount - right.amount) * multiplier;
        case "status":
          return left.status.localeCompare(right.status) * multiplier;
        case "date":
        default:
          return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * multiplier;
      }
    });

    return rows;
  }, [filteredOrders, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const paginatedOrders = sortedOrders.slice((page - 1) * pageSize, page * pageSize);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  function toggleSort(nextKey: SortKey) {
    setPage(1);
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "date" ? "desc" : "asc");
  }

  function exportCsv() {
    const lines = [
      [
        "Order ID",
        "Type",
        "Customer",
        "Email",
        "Item",
        "Amount",
        "Currency",
        "Status",
        "Payment Method",
        "Created At",
      ].join(","),
      ...sortedOrders.map((order) =>
        [
          csvEscape(order.id),
          csvEscape(order.kind === "subscription" ? "Subscription" : "Order"),
          csvEscape(order.customerName),
          csvEscape(order.customerEmail),
          csvEscape(order.itemSummary),
          csvEscape(order.amount.toFixed(2)),
          csvEscape(order.currency),
          csvEscape(order.status),
          csvEscape(order.paymentMethod),
          csvEscape(order.createdAt),
        ].join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleRefund(order: AdminOrderRecord) {
    const confirmed = window.confirm(`Refund order ${order.id}?`);
    if (!confirmed) return;

    setBusyAction("refund");
    startTransition(async () => {
      try {
        const result = await refundOrderAction(order.id);
        toast(result.message, result.success ? "success" : "error");
        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Unable to refund this order right now.", "error");
      } finally {
        setBusyAction(null);
      }
    });
  }

  function handleGrantAccess(order: AdminOrderRecord) {
    setBusyAction("grant");
    startTransition(async () => {
      try {
        const result = await grantOrderAccessAction(order.id);
        toast(result.message, result.success ? "success" : "error");
        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Unable to grant access right now.", "error");
      } finally {
        setBusyAction(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Orders"
        description="Review paid course orders and subscription purchases, export finance snapshots, and resolve fulfillment from one workspace."
        actions={
          <AdminButton type="button" icon={<Download className="h-4 w-4" />} onClick={exportCsv}>
            Export CSV
          </AdminButton>
        }
      />

      <AdminStatGrid>
        <AdminStatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue, "USD")} detail="Paid orders and active subscription revenue" />
        <AdminStatCard label="Total Orders" value={stats.totalOrders} detail="Courses and plan purchases combined" accent="from-cyan-500 to-blue-500" />
        <AdminStatCard label="Pending Refunds" value={stats.pendingRefunds} detail="Refunded transactions logged for review" accent="from-amber-500 to-orange-500" />
        <AdminStatCard label="Average Order Value" value={formatCurrency(stats.averageOrderValue, "USD")} detail="Based on paid transactions" accent="from-violet-500 to-blue-500" />
      </AdminStatGrid>

      <AdminCard className="p-5">
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <FieldLabel>Customer Search</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <AdminInput
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-11"
                placeholder="Search by order ID, customer, or email"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Status</FieldLabel>
            <AdminSelect
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as "all" | AdminOrderStatus);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
              <option value="Cancelled">Cancelled</option>
            </AdminSelect>
          </div>

          <div>
            <FieldLabel>Course / Plan</FieldLabel>
            <AdminSelect
              value={itemFilter}
              onChange={(event) => {
                setItemFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All items</option>
              {itemOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </AdminSelect>
          </div>

          <div>
            <FieldLabel>Date Range</FieldLabel>
            <div className="grid gap-3">
              <div className="relative">
                <CalendarRange className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <AdminInput
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setPage(1);
                  }}
                  className="pl-11"
                />
              </div>
              <AdminInput
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                {[
                  { key: "id" as const, label: "Order ID" },
                  { key: "customer" as const, label: "Customer" },
                  { key: "item" as const, label: "Item" },
                  { key: "amount" as const, label: "Amount" },
                  { key: "status" as const, label: "Status" },
                  { key: "date" as const, label: "Date" },
                ].map((column) => (
                  <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <button type="button" className="inline-flex items-center gap-2" onClick={() => toggleSort(column.key)}>
                      {column.label}
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    No orders match the current filters.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="cursor-pointer hover:bg-white/5"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <td className="px-4 py-4 align-top">
                      <div>
                        <p className="font-semibold text-white">{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.kind === "subscription" ? "Plan purchase" : "Course order"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div>
                        <p className="font-semibold text-white">{order.customerName}</p>
                        <p className="mt-1 text-xs text-slate-400">{order.customerEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div>
                        <p className="font-semibold text-white">{order.itemSummary}</p>
                        <p className="mt-1 text-xs text-slate-500">{order.itemLabels.length} item(s)</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top font-semibold text-white">{formatCurrency(order.amount, order.currency)}</td>
                    <td className="px-4 py-4 align-top">
                      <StatusPill tone={getStatusTone(order.status)}>{order.status}</StatusPill>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-300">{dateFormatter.format(new Date(order.createdAt))}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end">
                        <AdminButton
                          type="button"
                          variant="ghost"
                          icon={<Eye className="h-4 w-4" />}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedOrderId(order.id);
                          }}
                        >
                          View
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Showing {paginatedOrders.length === 0 ? 0 : (page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, sortedOrders.length)} of {sortedOrders.length}
          </p>
          <div className="flex items-center gap-2">
            <AdminButton type="button" variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </AdminButton>
            <span className="px-2 text-sm text-slate-400">
              Page {page} of {totalPages}
            </span>
            <AdminButton type="button" variant="secondary" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next
            </AdminButton>
          </div>
        </div>
      </AdminCard>

      <AdminModal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrderId(null)}
        title={selectedOrder ? `Order ${selectedOrder.id.slice(0, 8).toUpperCase()}` : "Order"}
        description="Review customer details, purchased items, payment metadata, and fulfillment actions."
        size="xl"
        scrollBody
        stickyFooter
        footer={
          selectedOrder ? (
            <div className="flex flex-wrap justify-end gap-3">
              <AdminButton type="button" variant="secondary" onClick={() => setSelectedOrderId(null)}>
                Close
              </AdminButton>
              {selectedOrder.actions.canGrantAccess ? (
                <AdminButton
                  type="button"
                  variant="secondary"
                  busy={busyAction === "grant"}
                  icon={<ShieldCheck className="h-4 w-4" />}
                  onClick={() => handleGrantAccess(selectedOrder)}
                >
                  Grant Access
                </AdminButton>
              ) : null}
              {selectedOrder.actions.canRefund ? (
                <AdminButton
                  type="button"
                  variant="danger"
                  busy={busyAction === "refund"}
                  icon={<RefreshCcw className="h-4 w-4" />}
                  onClick={() => handleRefund(selectedOrder)}
                >
                  Refund
                </AdminButton>
              ) : null}
            </div>
          ) : null
        }
      >
        {selectedOrder ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <AdminCard className="p-5">
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-blue-300" />
                <div>
                  <p className="text-lg font-black text-white">Customer Info</p>
                  <p className="text-sm text-slate-400">Billing and contact details tied to this purchase.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Customer</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Country</p>
                  <p className="mt-2 text-sm text-slate-300">{selectedOrder.customerCountry || "Not provided"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                    <Mail className="h-4 w-4 text-slate-500" />
                    {selectedOrder.customerEmail}
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-5">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-cyan-300" />
                <div>
                  <p className="text-lg font-black text-white">Payment Summary</p>
                  <p className="text-sm text-slate-400">Status, method, amount, and platform reference.</p>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Amount</p>
                  <p className="mt-2 text-lg font-black text-white">{formatCurrency(selectedOrder.amount, selectedOrder.currency)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
                  <div className="mt-2">
                    <StatusPill tone={getStatusTone(selectedOrder.status)}>{selectedOrder.status}</StatusPill>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment Method</p>
                  <p className="mt-2 text-sm text-slate-300">{selectedOrder.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reference</p>
                  <p className="mt-2 break-all text-sm text-slate-300">{selectedOrder.paymentReference || "No reference stored"}</p>
                </div>
                {selectedOrder.receiptUrl ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Receipt</p>
                    <a
                      href={selectedOrder.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-semibold text-blue-300 hover:text-blue-200"
                    >
                      Open receipt
                    </a>
                  </div>
                ) : null}
              </div>
            </AdminCard>

            <AdminCard className="p-5">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-violet-300" />
                <div>
                  <p className="text-lg font-black text-white">Items Purchased</p>
                  <p className="text-sm text-slate-400">Every course or plan included in this transaction.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {selectedOrder.kind === "subscription" ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="font-semibold text-white">{selectedOrder.itemSummary}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {selectedOrder.billingCycle || "Subscription"} billing
                      {selectedOrder.periodStart && selectedOrder.periodEnd
                        ? ` - ${dateFormatter.format(new Date(selectedOrder.periodStart))} to ${dateFormatter.format(new Date(selectedOrder.periodEnd))}`
                        : ""}
                    </p>
                  </div>
                ) : (
                  selectedOrder.courseItems.map((item) => (
                    <div key={item.courseId} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-400">{formatCurrency(item.price, selectedOrder.currency)}</p>
                        </div>
                        <StatusPill tone={item.hasAccess ? "success" : "warning"}>
                          {item.hasAccess ? "Access Granted" : "Needs Access"}
                        </StatusPill>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AdminCard>

            <AdminCard className="p-5">
              <div className="flex items-center gap-3">
                <RefreshCcw className="h-5 w-5 text-amber-300" />
                <div>
                  <p className="text-lg font-black text-white">Status History</p>
                  <p className="text-sm text-slate-400">Timeline of the order lifecycle and payment events.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {selectedOrder.statusHistory.map((entry) => (
                  <div key={`${entry.label}-${entry.timestamp}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-white">{entry.label}</p>
                      <p className="text-xs text-slate-500">{dateFormatter.format(new Date(entry.timestamp))}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{entry.detail}</p>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
