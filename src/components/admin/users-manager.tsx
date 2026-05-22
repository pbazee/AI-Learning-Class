"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Search,
  ShieldCheck,
  UserCircle2,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getUserDetailsAction, updateUserRoleAction } from "@/app/admin/actions";
import {
  AdminButton,
  AdminCard,
  AdminDrawer,
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
import type {
  AdminDirectoryFilters,
  AdminDirectoryMode,
  AdminDirectoryRow,
} from "@/lib/admin-user-directory-types";
import { cn, formatPrice } from "@/lib/utils";

type UserRow = AdminDirectoryRow;

type UserDetails = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRow["role"];
  avatarUrl?: string | null;
  bio?: string | null;
  country?: string | null;
  preferredCurrency: string;
  stripeCustomerId?: string | null;
  joinedAt: string;
  enrollments: Array<{
    id: string;
    courseTitle: string;
    courseSlug: string;
    thumbnailUrl?: string | null;
    status: string;
    enrolledAt: string;
    completedAt?: string | null;
    progress: number;
    completedLessons: number;
    totalLessons: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    date: string;
    items: string[];
    paymentMethod?: string | null;
    receiptUrl?: string | null;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    billingCycle: string;
    startedAt: string;
    endsAt: string;
    planName: string;
    revenueGenerated: number;
    coursesIncluded: string[];
  }>;
  certificates: Array<{
    id: string;
    code: string;
    issuedAt: string;
    pdfUrl?: string | null;
    courseTitle: string;
    courseSlug: string;
  }>;
  activity: Array<{
    id: string;
    type: string;
    label: string;
    detail: string;
    date: string;
  }>;
};

const detailFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const progressLabels: Record<UserRow["progressStatus"], string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

function getInitials(name?: string | null, email?: string) {
  const source = name?.trim() || email || "U";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function countActiveFilters(mode: AdminDirectoryMode, filters: AdminDirectoryFilters) {
  const values = [
    filters.search,
    mode === "users" ? (filters.role === "all" ? "" : filters.role) : "",
    filters.plan === "all" ? "" : filters.plan,
    mode === "learners" ? (filters.progress === "all" ? "" : filters.progress) : "",
    filters.country,
    filters.joinedFrom,
    filters.joinedTo,
    filters.sort !== "joined" ? filters.sort : "",
  ];

  return values.filter(Boolean).length;
}

function getActiveFilterChips(mode: AdminDirectoryMode, filters: AdminDirectoryFilters) {
  const chips: string[] = [];

  if (filters.search) chips.push(`Search: ${filters.search}`);
  if (mode === "users" && filters.role !== "all") chips.push(`Role: ${filters.role.replace("_", " ")}`);
  if (mode === "learners" && filters.progress !== "all") chips.push(`Progress: ${progressLabels[filters.progress]}`);
  if (filters.plan !== "all") chips.push(`Plan: ${filters.plan[0].toUpperCase()}${filters.plan.slice(1)}`);
  if (filters.country) chips.push(`Country: ${filters.country}`);
  if (filters.joinedFrom) chips.push(`From: ${filters.joinedFrom}`);
  if (filters.joinedTo) chips.push(`To: ${filters.joinedTo}`);
  if (filters.sort !== "joined") chips.push(`Sort: ${filters.sort}`);

  return chips;
}

function getProgressTone(status: UserRow["progressStatus"]) {
  if (status === "COMPLETED") return "success";
  if (status === "IN_PROGRESS") return "info";
  return "neutral";
}

function getProgressBarClass(status: UserRow["progressStatus"]) {
  if (status === "COMPLETED") {
    return "bg-gradient-to-r from-emerald-400 to-teal-300";
  }

  if (status === "IN_PROGRESS") {
    return "bg-gradient-to-r from-blue-500 to-cyan-400";
  }

  return "bg-slate-700";
}

export function UsersManager({
  mode,
  users,
  filters,
  total,
  pageCount,
  countries,
  title = "Users",
  description = "Review learner profiles, progress, payments, and certificates from a premium detail workspace.",
  resultLabel = "users",
}: {
  mode: AdminDirectoryMode;
  users: UserRow[];
  filters: AdminDirectoryFilters;
  total: number;
  pageCount: number;
  countries: string[];
  title?: string;
  description?: string;
  resultLabel?: string;
}) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeUser, setActiveUser] = useState<UserRow | null>(null);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [roleTarget, setRoleTarget] = useState<{
    userId: string;
    nextRole: "STUDENT" | "INSTRUCTOR" | "ADMIN";
    label: string;
  } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const studentCount = useMemo(
    () => users.filter((user) => user.role === "STUDENT").length,
    [users]
  );
  const instructorCount = useMemo(
    () => users.filter((user) => user.role === "INSTRUCTOR").length,
    [users]
  );
  const adminCount = useMemo(
    () => users.filter((user) => user.role === "ADMIN" || user.role === "SUPER_ADMIN").length,
    [users]
  );
  const activeFilterCount = countActiveFilters(mode, filters);
  const activeFilterChips = getActiveFilterChips(mode, filters);
  const totalSubscriptionRevenue = useMemo(
    () => users.reduce((sum, user) => sum + user.totalSpent, 0),
    [users]
  );
  const showingFrom = total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const showingTo = Math.min(filters.page * filters.pageSize, total);

  function updateFilters(next: Partial<AdminDirectoryFilters>) {
    const params = new URLSearchParams(searchParams.toString());

    const merged: AdminDirectoryFilters = {
      ...filters,
      ...next,
      page: next.page ?? (Object.keys(next).some((key) => key !== "page") ? 1 : filters.page),
    };

    const entries: Array<[string, string]> = [
      ["page", merged.page > 1 ? String(merged.page) : ""],
      ["search", merged.search],
      ["role", mode === "users" && merged.role !== "all" ? merged.role : ""],
      ["plan", merged.plan !== "all" ? merged.plan : ""],
      ["progress", mode === "learners" && merged.progress !== "all" ? merged.progress : ""],
      ["country", merged.country],
      ["from", merged.joinedFrom],
      ["to", merged.joinedTo],
      ["sort", merged.sort !== "joined" ? merged.sort : ""],
    ];

    for (const [key, value] of entries) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, {
      scroll: false,
    });
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (searchInput !== filters.search) {
        updateFilters({ search: searchInput });
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [filters.search, searchInput]);

  function openDetails(user: UserRow) {
    setActiveUser(user);
    setDrawerOpen(true);
    setLoading(true);
    startTransition(async () => {
      const result = await getUserDetailsAction(user.id);
      if (!result.success || !result.data) {
        toast(result.message, "error");
        setLoading(false);
        return;
      }

      setDetails(result.data as UserDetails);
      setLoading(false);
    });
  }

  function confirmRoleChange(nextRole: "STUDENT" | "INSTRUCTOR" | "ADMIN", label: string) {
    if (!details) return;
    setRoleTarget({
      userId: details.id,
      nextRole,
      label,
    });
  }

  function handleRoleChange() {
    if (!roleTarget) {
      return;
    }

    startTransition(async () => {
      const result = await updateUserRoleAction({
        userId: roleTarget.userId,
        role: roleTarget.nextRole,
      });

      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        setRoleTarget(null);
        router.refresh();
        if (details) {
          setDetails({
            ...details,
            role: roleTarget.nextRole,
          });
        }
      }
    });
  }

  function clearFilters() {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Audience"
        title={`${title} (${total.toLocaleString()} total)`}
        description={description}
      />

      <AdminStatGrid>
        <AdminStatCard label="Total Users" value={total.toLocaleString()} />
        <AdminStatCard label="Students" value={studentCount} accent="from-blue-500 to-cyan-400" />
        <AdminStatCard label="Instructors" value={instructorCount} accent="from-emerald-500 to-teal-400" />
        <AdminStatCard label="Admins" value={adminCount} accent="from-amber-500 to-orange-400" />
        <AdminStatCard
          label="Active Subscribers"
          value={users.filter((user) => user.activeSubscriptions > 0).length}
          accent="from-violet-500 to-fuchsia-400"
        />
        <AdminStatCard
          label="Tracked Revenue"
          value={formatPrice(totalSubscriptionRevenue)}
          accent="from-pink-500 to-rose-400"
        />
      </AdminStatGrid>

      <AdminCard className="p-5">
        <div className="mb-4 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Directory Controls</p>
            <p className="mt-2 text-sm text-slate-300">
              Adjust filters, share the URL, and move through paginated results without losing state.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2">
              Filters ({activeFilterCount})
            </span>
            <span className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2">
              Page {filters.page} of {pageCount}
            </span>
            <span className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2">
              Showing {showingFrom}-{showingTo}
            </span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <AdminInput
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name or email..."
                className="bg-slate-950/70 pl-10 pr-11 text-slate-100 placeholder:text-slate-500"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    updateFilters({ search: "" });
                  }}
                  className="absolute right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          {mode === "users" ? (
            <div>
              <FieldLabel>Role</FieldLabel>
              <AdminSelect
                value={filters.role}
                onChange={(event) =>
                  updateFilters({ role: event.target.value as AdminDirectoryFilters["role"] })
                }
              >
                <option value="all">All roles</option>
                <option value="STUDENT">Student</option>
                <option value="ADMIN">Admin</option>
                <option value="INSTRUCTOR">Instructor</option>
              </AdminSelect>
            </div>
          ) : (
            <div>
              <FieldLabel>Progress</FieldLabel>
              <AdminSelect
                value={filters.progress}
                onChange={(event) =>
                  updateFilters({ progress: event.target.value as AdminDirectoryFilters["progress"] })
                }
              >
                <option value="all">All progress</option>
                <option value="NOT_STARTED">Not started</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
              </AdminSelect>
            </div>
          )}

          <div>
            <FieldLabel>Plan</FieldLabel>
            <AdminSelect
              value={filters.plan}
              onChange={(event) =>
                updateFilters({ plan: event.target.value as AdminDirectoryFilters["plan"] })
              }
            >
              <option value="all">All plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="teams">Teams</option>
            </AdminSelect>
          </div>

          <div>
            <FieldLabel>Country</FieldLabel>
            <AdminSelect
              value={filters.country || "all"}
              onChange={(event) =>
                updateFilters({ country: event.target.value === "all" ? "" : event.target.value })
              }
            >
              <option value="all">All countries</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </AdminSelect>
          </div>

          <div>
            <FieldLabel>Sort by</FieldLabel>
            <AdminSelect value={filters.sort} onChange={(event) => updateFilters({ sort: event.target.value })}>
              <option value="joined">Date joined</option>
              <option value="revenue">Revenue</option>
              {mode === "users" ? (
                <option value="courses">Courses enrolled</option>
              ) : (
                <option value="lastActive">Last active</option>
              )}
              {mode === "learners" ? <option value="progress">Progress</option> : null}
              <option value="name">Name</option>
            </AdminSelect>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Date joined from</FieldLabel>
            <AdminInput
              type="date"
              value={filters.joinedFrom}
              onChange={(event) => updateFilters({ joinedFrom: event.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Date joined to</FieldLabel>
            <AdminInput
              type="date"
              value={filters.joinedTo}
              onChange={(event) => updateFilters({ joinedTo: event.target.value })}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-400">
              Showing {showingFrom}-{showingTo} of {total.toLocaleString()} {resultLabel}
            </div>
            <AdminButton
              type="button"
              variant="secondary"
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
            >
              Clear Filters
            </AdminButton>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFilterChips.length > 0 ? (
              activeFilterChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-primary-blue/25 bg-primary-blue/10 px-3 py-1 text-xs font-medium text-blue-100"
                >
                  {chip}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-500">
                No active filters
              </span>
            )}
          </div>
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {[
                  "User",
                  "Role",
                  "Plan",
                  "Country",
                  mode === "learners" ? "Progress" : "Learning",
                  "Revenue",
                  "Joined",
                  "Details",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-cyan-400/10 text-sm font-bold text-blue-100">
                        {getInitials(user.name, user.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{user.name || "Unnamed user"}</p>
                        <p className="mt-1 truncate text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill
                      tone={
                        user.role.includes("ADMIN")
                          ? "warning"
                          : user.role === "INSTRUCTOR"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {user.role.replace("_", " ")}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill
                      tone={
                        user.planLabel === "Pro"
                          ? "info"
                          : user.planLabel === "Teams"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {user.planLabel}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{user.country || "Unknown"}</td>
                  <td className="px-4 py-4">
                    {mode === "learners" ? (
                      <div className="min-w-[220px]">
                        <StatusPill tone={getProgressTone(user.progressStatus)}>
                          {progressLabels[user.progressStatus]}
                        </StatusPill>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                          <div
                            className={cn("h-full rounded-full", getProgressBarClass(user.progressStatus))}
                            style={{
                              width: `${Math.max(
                                user.progressPercent,
                                user.progressStatus === "NOT_STARTED" ? 8 : 0
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          {user.progressPercent}% complete
                          {user.lastActiveAt
                            ? ` • active ${detailFormatter.format(new Date(user.lastActiveAt))}`
                            : " • no activity yet"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-semibold text-white">{user.enrollmentsCount} courses</p>
                        <p className="text-xs text-slate-400">{user.activeSubscriptions} active plans</p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 font-semibold text-white">{formatPrice(user.totalSpent)}</td>
                  <td className="px-4 py-4 text-slate-300">{detailFormatter.format(new Date(user.joinedAt))}</td>
                  <td className="px-4 py-4">
                    <AdminButton
                      type="button"
                      variant="ghost"
                      icon={<ArrowRight className="h-4 w-4" />}
                      onClick={() => openDetails(user)}
                    >
                      View Details
                    </AdminButton>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                    No {resultLabel} match the current filters. Clear a filter or widen the search to
                    see more results.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Showing {showingFrom}-{showingTo} of {total.toLocaleString()} {resultLabel}
          </p>
          <div className="flex items-center gap-2">
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => updateFilters({ page: Math.max(filters.page - 1, 1) })}
              disabled={filters.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </AdminButton>
            <div className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-300">
              Page {filters.page} of {pageCount}
            </div>
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => updateFilters({ page: Math.min(filters.page + 1, pageCount) })}
              disabled={filters.page >= pageCount}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </AdminButton>
          </div>
        </div>
      </AdminCard>

      <AdminDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setActiveUser(null);
          setDetails(null);
          setLoading(false);
        }}
        title={activeUser?.name || activeUser?.email || "User Details"}
        description="Complete learner profile, payment history, subscriptions, and achievements."
        size="full"
      >
        {loading || !details ? (
          <AdminCard className="p-8">
            <p className="text-sm text-slate-400">Loading user profile details...</p>
          </AdminCard>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <AdminCard className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                    <UserCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Personal Info</p>
                    <p className="mt-1 text-2xl font-black text-white">{details.name || details.email}</p>
                    <p className="mt-1 text-sm text-slate-400">{details.email}</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Role</p>
                    <p className="mt-2 text-lg font-semibold text-white">{details.role.replace("_", " ")}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Joined</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {detailFormatter.format(new Date(details.joinedAt))}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Country</p>
                    <p className="mt-2 text-lg font-semibold text-white">{details.country || "Unknown"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Currency</p>
                    <p className="mt-2 text-lg font-semibold text-white">{details.preferredCurrency}</p>
                  </div>
                </div>
                {details.bio ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                    {details.bio}
                  </div>
                ) : null}
              </AdminCard>

              <AdminCard className="p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <ShieldCheck className="h-4 w-4 text-amber-300" />
                  Role Management
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  Update the access level for this user with an explicit confirmation step.
                </p>
                <div className="mt-5 grid gap-3">
                  <AdminButton
                    type="button"
                    onClick={() => confirmRoleChange("ADMIN", "Promote to Admin")}
                    disabled={details.role === "SUPER_ADMIN"}
                  >
                    Promote to Admin
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={() => confirmRoleChange("INSTRUCTOR", "Promote to Instructor")}
                    disabled={details.role === "SUPER_ADMIN"}
                  >
                    Promote to Instructor
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="ghost"
                    onClick={() => confirmRoleChange("STUDENT", "Demote to Student")}
                    disabled={details.role === "SUPER_ADMIN"}
                  >
                    Demote to Student
                  </AdminButton>
                </div>
              </AdminCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <AdminCard className="p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <CreditCard className="h-4 w-4 text-blue-300" />
                  Enrolled Courses
                </div>
                <div className="mt-4 space-y-3">
                  {details.enrollments.length === 0 ? (
                    <p className="text-sm text-slate-400">No enrollments yet.</p>
                  ) : (
                    details.enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">{enrollment.courseTitle}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {enrollment.completedLessons}/{enrollment.totalLessons} lessons completed
                            </p>
                          </div>
                          <StatusPill tone={enrollment.status === "COMPLETED" ? "success" : "info"}>
                            {enrollment.status}
                          </StatusPill>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                            style={{ width: `${enrollment.progress}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Enrolled {detailFormatter.format(new Date(enrollment.enrolledAt))}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </AdminCard>

              <AdminCard className="p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <CreditCard className="h-4 w-4 text-cyan-300" />
                  Payments & Subscriptions
                </div>
                <div className="mt-4 space-y-3">
                  {details.payments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{payment.items.join(", ") || "Purchase"}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {detailFormatter.format(new Date(payment.date))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">
                            {formatPrice(payment.amount, payment.currency)}
                          </p>
                          <StatusPill tone={payment.status === "COMPLETED" ? "success" : "warning"}>
                            {payment.status}
                          </StatusPill>
                        </div>
                      </div>
                    </div>
                  ))}
                  {details.subscriptions.map((subscription) => (
                    <div key={subscription.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{subscription.planName}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {subscription.billingCycle} • ends {detailFormatter.format(new Date(subscription.endsAt))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">
                            {formatPrice(subscription.revenueGenerated)}
                          </p>
                          <StatusPill tone={subscription.status === "ACTIVE" ? "success" : "warning"}>
                            {subscription.status}
                          </StatusPill>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-slate-400">
                        Includes: {subscription.coursesIncluded.join(", ")}
                      </p>
                    </div>
                  ))}
                  {details.payments.length === 0 && details.subscriptions.length === 0 ? (
                    <p className="text-sm text-slate-400">No payment or subscription history yet.</p>
                  ) : null}
                </div>
              </AdminCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <AdminCard className="p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Award className="h-4 w-4 text-emerald-300" />
                  Certificates Earned
                </div>
                <div className="mt-4 space-y-3">
                  {details.certificates.length === 0 ? (
                    <p className="text-sm text-slate-400">No certificates earned yet.</p>
                  ) : (
                    details.certificates.map((certificate) => (
                      <div key={certificate.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-sm font-semibold text-white">{certificate.courseTitle}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Issued {detailFormatter.format(new Date(certificate.issuedAt))}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">Certificate code: {certificate.code}</p>
                      </div>
                    ))
                  )}
                </div>
              </AdminCard>

              <AdminCard className="p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <CreditCard className="h-4 w-4 text-violet-300" />
                  Activity Log
                </div>
                <div className="mt-4 space-y-3">
                  {details.activity.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{event.label}</p>
                          <p className="mt-1 text-xs text-slate-400">{event.detail}</p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {detailFormatter.format(new Date(event.date))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>
            </div>
          </div>
        )}
      </AdminDrawer>

      <AdminModal
        open={Boolean(roleTarget)}
        onClose={() => setRoleTarget(null)}
        title={roleTarget?.label || "Update role"}
        description="Confirm this role change before it is applied."
        footer={
          <div className="flex justify-end gap-3">
            <AdminButton type="button" variant="secondary" onClick={() => setRoleTarget(null)}>
              Cancel
            </AdminButton>
            <AdminButton type="button" onClick={handleRoleChange}>
              Confirm
            </AdminButton>
          </div>
        }
      >
        <p className="text-sm text-slate-400">
          This will immediately update the user&apos;s admin-console permissions and storefront access level.
        </p>
      </AdminModal>
    </div>
  );
}
