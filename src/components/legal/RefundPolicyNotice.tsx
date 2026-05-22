"use client";

import Link from "next/link";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type RefundPolicyNoticeProps = {
  summary: string;
  updatedAtLabel: string;
  compact?: boolean;
  className?: string;
  tone?: "default" | "inverse";
};

export function RefundPolicyNotice({
  summary,
  updatedAtLabel,
  compact = false,
  className,
  tone = "default",
}: RefundPolicyNoticeProps) {
  const isInverse = tone === "inverse";

  return (
    <div
      className={cn(
        "rounded-2xl shadow-sm backdrop-blur-sm",
        isInverse
          ? "border border-white/25 bg-slate-950/16 text-white shadow-none"
          : "border border-slate-300/70 bg-white/92 dark:border-white/20 dark:bg-slate-950/35",
        compact ? "px-4 py-3" : "px-4 py-4 sm:px-5",
        className
      )}
    >
      <p
        className={cn(
          "text-[13px] leading-5",
          isInverse ? "font-medium text-white/92" : "font-medium text-slate-700 dark:text-slate-200"
        )}
      >
        By completing your purchase you agree to our{" "}
        <Link
          href="/refund"
          className={cn(
            "font-semibold underline decoration-2 underline-offset-4 transition-colors",
            isInverse
              ? "text-cyan-200 hover:text-white"
              : "text-cyan-700 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
          )}
        >
          Refund Policy
        </Link>
        .
      </p>

      <Accordion.Root type="single" collapsible className="mt-2">
        <Accordion.Item value="summary" className="border-none">
          <Accordion.Header>
            <Accordion.Trigger
              className={cn(
                "group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors",
                isInverse
                  ? "border border-white/35 bg-white/6 text-white hover:border-cyan-200 hover:bg-white/10 hover:text-cyan-100"
                  : "border border-slate-300/80 text-slate-700 hover:border-primary-blue/45 hover:text-primary-blue dark:border-white/20 dark:text-slate-200 dark:hover:border-cyan-300/40 dark:hover:text-cyan-200"
              )}
            >
              View refund summary
              <ChevronDown className="h-4 w-4 shrink-0 transition group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content
            className={cn(
              "overflow-hidden pt-3 text-sm leading-6 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
              isInverse ? "text-white/88" : "text-slate-600 dark:text-slate-300"
            )}
          >
            <p>{summary}</p>
            <p className={cn("mt-2 text-xs", isInverse ? "text-white/72" : "text-slate-500 dark:text-slate-400")}>
              Last updated: {updatedAtLabel}
            </p>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}
