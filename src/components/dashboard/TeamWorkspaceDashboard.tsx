"use client";

import { type Dispatch, type SetStateAction, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  Copy,
  Link2,
  Loader2,
  MailPlus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";
import type { TeamWorkspaceDashboardData } from "@/types";

export function TeamWorkspaceDashboard({
  initialData,
}: {
  initialData: TeamWorkspaceDashboardData;
}) {
  const [data, setData] = useState(initialData);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const activeMembers = useMemo(
    () => data.members.filter((member) => member.role !== "OWNER"),
    [data.members]
  );

  async function refreshDashboard() {
    const response = await fetch("/api/team/workspace", { cache: "no-store" });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.data) {
      throw new Error(payload?.error || "Unable to refresh the Teams workspace.");
    }

    setData(payload.data);
  }

  async function runAction(body: Record<string, unknown>, successMessage: string) {
    const response = await fetch("/api/team/workspace", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error || "Unable to complete that action right now.");
    }

    await refreshDashboard();
    toast(successMessage, "success");
    return payload;
  }

  function toggleSelection(
    value: string,
    list: string[],
    setList: Dispatch<SetStateAction<string[]>>
  ) {
    setList((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value]
    );
  }

  function formatDate(value?: string | null) {
    if (!value) return "No activity yet";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  }

  async function createEmailInvite() {
    startTransition(async () => {
      try {
        const payload = await runAction(
          { action: "createInvite", email: inviteEmail },
          "Invite created successfully."
        );
        setInviteEmail("");

        if (payload?.invite?.inviteLink) {
          await navigator.clipboard.writeText(payload.invite.inviteLink);
          toast("Invite link copied so you can send it right away.", "success");
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Unable to create invite.", "error");
      }
    });
  }

  async function createShareableInvite() {
    startTransition(async () => {
      try {
        const payload = await runAction(
          { action: "createInvite" },
          "Shareable invite created."
        );

        if (payload?.invite?.inviteLink) {
          await navigator.clipboard.writeText(payload.invite.inviteLink);
          toast("Share link copied to your clipboard.", "success");
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Unable to create invite link.", "error");
      }
    });
  }

  async function assignCourses() {
    startTransition(async () => {
      try {
        await runAction(
          {
            action: "bulkAssign",
            courseIds: selectedCourseIds,
            memberIds: selectedMemberIds,
          },
          "Assignments sent to your selected teammates."
        );
        setSelectedCourseIds([]);
      } catch (error) {
        toast(error instanceof Error ? error.message : "Unable to assign courses.", "error");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[36px] border border-primary-blue/20 bg-[linear-gradient(135deg,#0f172a_0%,#0056d2_52%,#071124_120%)] p-8 text-white shadow-[0_28px_90px_-45px_rgba(2,6,23,0.9)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/78">
              Teams Admin
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Manage seats, learning progress, and course assignments from one workspace.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/88">
              Your Teams plan gives every member full classroom access, a shared invite flow,
              member-level progress visibility, and export-ready reporting.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/team/workspace/export"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/14"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Export CSV
            </a>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-primary-blue hover:bg-white/95"
            >
              Browse all courses
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Active Members",
            value: data.metrics.activeMembers,
            detail: `${data.workspace.seatsAvailable} seats left`,
          },
          {
            label: "Pending Invites",
            value: data.metrics.pendingInvites,
            detail: "Email + link invites",
          },
          {
            label: "Assigned Courses",
            value: data.metrics.assignedCourses,
            detail: "Bulk team rollout",
          },
          {
            label: "Average Progress",
            value: `${data.metrics.averageProgress}%`,
            detail: data.workspace.planEndsAt
              ? `Plan renews through ${formatDate(data.workspace.planEndsAt)}`
              : "Active workspace",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-black text-foreground">{card.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{card.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                  Invite Members
                </p>
                <h2 className="mt-2 text-2xl font-black text-foreground">
                  Invite by email or generate a shareable access link.
                </h2>
              </div>
              <div className="rounded-2xl border border-primary-blue/20 bg-primary-blue/10 px-4 py-2 text-sm font-semibold text-primary-blue">
                {data.workspace.seatsUsed}/{data.workspace.seatLimit} seats used
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="teammate@company.com"
                className="input-surface w-full"
              />
              <button
                type="button"
                onClick={createEmailInvite}
                disabled={isPending || !inviteEmail.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-blue px-4 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                Send Invite
              </button>
              <button
                type="button"
                onClick={createShareableInvite}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:border-primary-blue/30 hover:bg-primary-blue/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Link2 className="h-4 w-4 text-primary-blue" />
                Copy Link
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Workspace Code
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-lg font-black text-foreground">{data.workspace.inviteCode}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(data.workspace.inviteCode)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-primary-blue/30 hover:bg-primary-blue/5"
                >
                  <Copy className="h-3.5 w-3.5 text-primary-blue" />
                  Copy code
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                Bulk Assignments
              </p>
              <h2 className="mt-2 text-2xl font-black text-foreground">
                Assign courses to multiple members at once.
              </h2>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">Choose teammates</p>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
                  {activeMembers.map((member) => (
                    <label
                      key={member.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
                        selectedMemberIds.includes(member.id)
                          ? "border-primary-blue bg-primary-blue/5"
                          : "border-border hover:border-primary-blue/20"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(member.id)}
                        onChange={() => toggleSelection(member.id, selectedMemberIds, setSelectedMemberIds)}
                        className="mt-1 h-4 w-4 rounded border-border text-primary-blue"
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">Choose courses</p>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
                  {data.availableCourses.map((course) => (
                    <label
                      key={course.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
                        selectedCourseIds.includes(course.id)
                          ? "border-primary-blue bg-primary-blue/5"
                          : "border-border hover:border-primary-blue/20"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCourseIds.includes(course.id)}
                        onChange={() => toggleSelection(course.id, selectedCourseIds, setSelectedCourseIds)}
                        className="mt-1 h-4 w-4 rounded border-border text-primary-blue"
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{course.title}</p>
                        <p className="text-xs text-muted-foreground">/{course.slug}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={assignCourses}
              disabled={isPending || selectedCourseIds.length === 0 || selectedMemberIds.length === 0}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Assign selected courses
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary-blue" />
              <h2 className="text-lg font-black text-foreground">Pending invites</h2>
            </div>
            {data.invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending invites right now.
              </p>
            ) : (
              <div className="space-y-3">
                {data.invites.map((invite) => (
                  <div key={invite.id} className="rounded-2xl border border-border p-4">
                    <p className="text-sm font-semibold text-foreground">
                      {invite.invitedEmail || "Shareable invite link"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Expires {formatDate(invite.expiresAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(invite.inviteLink)}
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-primary-blue/30 hover:bg-primary-blue/5"
                      >
                        <Copy className="h-3.5 w-3.5 text-primary-blue" />
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await runAction(
                                { action: "revokeInvite", inviteId: invite.id },
                                "Invite revoked."
                              );
                            } catch (error) {
                              toast(error instanceof Error ? error.message : "Unable to revoke invite.", "error");
                            }
                          })
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                30% Commission Messaging
              </p>
              <h2 className="mt-2 text-lg font-black text-foreground">
                Team value at a glance
              </h2>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Every team seat gets full Pro-style classroom access across the catalog.</p>
              <p>Invite by email or shareable link, then assign courses in bulk from this workspace.</p>
              <p>Exports give you a clean snapshot of member activity and completion momentum.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
              Member Progress
            </p>
            <h2 className="mt-2 text-2xl font-black text-foreground">
              Per-user learning analytics
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <th className="pb-3 pr-4">Member</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Assigned</th>
                <th className="pb-3 pr-4">Started</th>
                <th className="pb-3 pr-4">Lessons</th>
                <th className="pb-3 pr-4">Progress</th>
                <th className="pb-3 pr-4">Last Activity</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => (
                <tr key={member.id} className="border-b border-border/70 align-top">
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <span className="rounded-full bg-primary-blue/10 px-3 py-1 text-xs font-semibold text-primary-blue">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-foreground">{member.assignedCourses}</td>
                  <td className="py-4 pr-4 text-foreground">{member.startedCourses}</td>
                  <td className="py-4 pr-4 text-foreground">{member.completedLessons}</td>
                  <td className="py-4 pr-4">
                    <div className="w-32">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-foreground">{member.averageProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary-blue"
                          style={{ width: `${member.averageProgress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-xs text-muted-foreground">
                    {formatDate(member.lastActivity)}
                  </td>
                  <td className="py-4">
                    {member.role === "OWNER" ? (
                      <span className="text-xs font-semibold text-muted-foreground">Owner</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await runAction(
                                { action: "revokeMember", memberId: member.id },
                                "Member access revoked."
                              );
                              setSelectedMemberIds((current) =>
                                current.filter((entry) => entry !== member.id)
                              );
                            } catch (error) {
                              toast(error instanceof Error ? error.message : "Unable to revoke member.", "error");
                            }
                          })
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
