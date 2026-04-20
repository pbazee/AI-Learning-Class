"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { getSupabaseClient } from "@/lib/supabase";

export function AdminSessionControls() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    setBusy(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      toast("Signed out successfully.", "success");
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to sign out right now.", "error");
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-blue-300/40 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Log out
      </button>
    </div>
  );
}
