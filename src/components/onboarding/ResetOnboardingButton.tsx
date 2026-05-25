"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ONBOARDING_STORAGE_KEY = "ai-learning-signup-onboarding";

export function ResetOnboardingButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleReset() {
    setIsPending(true);

    try {
      await fetch("/api/account/onboarding", {
        method: "DELETE",
      });
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      }

      router.push("/signup?step=quiz&redirect=/settings");
      router.refresh();
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleReset()}
      disabled={isPending}
      className={className}
    >
      {children}
    </button>
  );
}
