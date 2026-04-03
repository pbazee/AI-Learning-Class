"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export function AcceptTeamInviteCard({ token }: { token: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [acceptedWorkspace, setAcceptedWorkspace] = useState<string | null>(null);

  async function acceptInvite() {
    setLoading(true);

    try {
      const response = await fetch("/api/team/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "acceptInvite",
          token,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to join this Teams workspace.");
      }

      setAcceptedWorkspace(payload?.result?.workspaceName ?? "your workspace");
      toast("Teams access activated successfully.", "success");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to join this workspace.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[36px] border border-border bg-card p-10 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-blue/10 text-primary-blue">
        <Users className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-black text-foreground">Join this Teams workspace</h1>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
        Accept the invite to unlock full classroom access, assigned learning paths, and shared progress tracking inside the team dashboard.
      </p>
      {acceptedWorkspace ? (
        <div className="mt-6 rounded-2xl border border-primary-blue/20 bg-primary-blue/10 px-4 py-4 text-sm font-medium text-primary-blue">
          You&apos;re in. {acceptedWorkspace} is now available from your classroom and dashboard.
        </div>
      ) : null}
      <button
        type="button"
        onClick={acceptInvite}
        disabled={loading || Boolean(acceptedWorkspace)}
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {acceptedWorkspace ? "Invite Accepted" : "Accept Invite"}
      </button>
    </div>
  );
}
