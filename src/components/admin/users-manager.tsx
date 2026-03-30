"use client";

import { startTransition, useMemo, useState } from "react";
import { ArrowRight, Award, CreditCard, ShieldCheck, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getUserDetailsAction, updateUserRoleAction } from "@/app/admin/actions";
import { AdminButton, AdminCard, AdminDrawer, AdminModal, AdminPageIntro, AdminStatCard, AdminStatGrid, StatusPill } from "@/components/admin/ui";
import { useToast } from "@/components/ui/toaster";
import { formatPrice } from "@/lib/utils";

type UserRow = {
  id: string;
  name?: string | null;
  email: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN" | "SUPER_ADMIN";
  country?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  enrollmentsCount: number;
  activeSubscriptions: number;
  totalSpent: number;
  joinedAt: string;
};

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

export function UsersManager({ users }: { users: UserRow[] }) {
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
  const { toast } = useToast();

  const studentCount = users.filter((user) => user.role === "STUDENT").length;
  const instructorCount = users.filter((user) => user.role === "INSTRUCTOR").length;
  const adminCount = users.filter((user) => user.role === "ADMIN" || user.role === "SUPER_ADMIN").length;

  const totalSubscriptionRevenue = useMemo(
    () => users.reduce((sum, user) => sum + user.totalSpent, 0),
    [users]
  );

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

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Audience"
        title="Users"
        description="Review learner profiles, progress, payments, and certificates from a premium detail workspace."
      />

      <AdminStatGrid>
        <AdminStatCard label="Total Users" value={users.length} />
        <AdminStatCard label="Students" value={studentCount} accent="from-blue-500 to-cyan-400" />
        <AdminStatCard label="Instructors" value={instructorCount} accent="from-emerald-500 to-teal-400" />
        <AdminStatCard label="Admins" value={adminCount} accent="from-amber-500 to-orange-400" />
        <AdminStatCard label="Active Subscribers" value={users.filter((user) => user.activeSubscriptions > 0).length} accent="from-violet-500 to-fuchsia-400" />
        <AdminStatCard label="Tracked Revenue" value={formatPrice(totalSubscriptionRevenue)} accent="from-pink-500 to-rose-400" />
      </AdminStatGrid>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {["User", "Role", "Country", "Learning", "Revenue", "Joined", "Details"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-white">{user.name || "Unnamed user"}</p>
                      <p className="mt-1 text-xs text-slate-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill tone={user.role.includes("ADMIN") ? "warning" : user.role === "INSTRUCTOR" ? "info" : "neutral"}>
                      {user.role.replace("_", " ")}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{user.country || "Unknown"}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{user.enrollmentsCount} courses</p>
                    <p className="mt-1 text-xs text-slate-400">{user.activeSubscriptions} active plans</p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-white">{formatPrice(user.totalSpent)}</td>
                  <td className="px-4 py-4 text-slate-300">{user.joinedAt}</td>
                  <td className="px-4 py-4">
                    <AdminButton type="button" variant="ghost" icon={<ArrowRight className="h-4 w-4" />} onClick={() => openDetails(user)}>
                      View Details
                    </AdminButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <p className="text-sm text-slate-400">Loading user profile details…</p>
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
                    <p className="mt-2 text-lg font-semibold text-white">{detailFormatter.format(new Date(details.joinedAt))}</p>
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
                  <AdminButton type="button" onClick={() => confirmRoleChange("ADMIN", "Promote to Admin")} disabled={details.role === "SUPER_ADMIN"}>
                    Promote to Admin
                  </AdminButton>
                  <AdminButton type="button" variant="secondary" onClick={() => confirmRoleChange("INSTRUCTOR", "Promote to Instructor")} disabled={details.role === "SUPER_ADMIN"}>
                    Promote to Instructor
                  </AdminButton>
                  <AdminButton type="button" variant="ghost" onClick={() => confirmRoleChange("STUDENT", "Demote to Student")} disabled={details.role === "SUPER_ADMIN"}>
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
                          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${enrollment.progress}%` }} />
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
                          <p className="mt-1 text-xs text-slate-400">{detailFormatter.format(new Date(payment.date))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{formatPrice(payment.amount, payment.currency)}</p>
                          <StatusPill tone={payment.status === "COMPLETED" ? "success" : "warning"}>{payment.status}</StatusPill>
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
                          <p className="text-sm font-semibold text-white">{formatPrice(subscription.revenueGenerated)}</p>
                          <StatusPill tone={subscription.status === "ACTIVE" ? "success" : "warning"}>{subscription.status}</StatusPill>
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
                        <p className="mt-1 text-xs text-slate-400">Issued {detailFormatter.format(new Date(certificate.issuedAt))}</p>
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
                        <p className="text-xs text-slate-500">{detailFormatter.format(new Date(event.date))}</p>
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
          This will immediately update the user’s admin-console permissions and storefront access level.
        </p>
      </AdminModal>
    </div>
  );
}
