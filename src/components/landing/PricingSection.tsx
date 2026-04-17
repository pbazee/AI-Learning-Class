"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import {
  type BillingCycle,
  getBillingCycleLabel,
  getYearlySavings,
  resolveYearlyPrice,
} from "@/lib/site";
import { cn, formatPrice } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types";

const planCtaCopy: Record<string, { href: string; label: string }> = {
  free: { href: "/courses?price=free", label: "Start Free Plan" },
  pro: { href: "/checkout?plan=pro", label: "Choose Pro" },
  teams: { href: "/checkout?plan=teams", label: "Choose Teams" },
};

export function PricingSection({ plans }: { plans: SubscriptionPlan[] }) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  if (plans.length === 0) {
    return null;
  }

  return (
    <section className="section-shell" id="pricing">
      <div className="section-frame">
        <div className="mb-14 text-center">
          <div className="eyebrow-badge mb-4">
            <Zap className="h-4 w-4" />
            <span>Simple pricing</span>
          </div>
          <h2 className="mb-4 text-3xl font-black text-foreground sm:text-4xl">
            Choose your <span className="gradient-text">AI plan</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground">
            Pick the exact learning access you need, from free courses to full-team enablement.
          </p>
          <div className="mt-6 inline-flex rounded-full border border-border bg-card p-1">
            {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  billingCycle === cycle
                    ? "bg-primary-blue text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {getBillingCycleLabel(cycle)}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan, index) => {
            const cta = planCtaCopy[plan.slug]
              ? {
                  ...planCtaCopy[plan.slug],
                  href:
                    plan.slug === "free"
                      ? planCtaCopy[plan.slug].href
                      : `${planCtaCopy[plan.slug].href}&billing=${billingCycle}`,
                }
              : { href: `/checkout?plan=${plan.slug}&billing=${billingCycle}`, label: `Choose ${plan.name}` };
            const isFreePlan = plan.price === 0;
            const resolvedYearlyPrice = resolveYearlyPrice(plan.price, plan.yearlyPrice);
            const savings = getYearlySavings(plan.price, resolvedYearlyPrice);
            const displayPrice =
              isFreePlan || billingCycle === "monthly"
                ? plan.price
                : resolvedYearlyPrice ?? plan.price * 12;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className={cn(
                  "relative flex h-full flex-col rounded-[30px] border p-6 shadow-sm sm:p-8",
                  plan.isPopular
                    ? "border-primary-blue bg-primary-blue text-white shadow-[0_24px_60px_rgba(59,130,246,0.24)]"
                    : "bg-card text-foreground"
                )}
              >
                {plan.isPopular ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-blue">
                    Most Popular
                  </div>
                ) : null}

                <div className="mb-6">
                  <h3 className="mb-2 text-2xl font-black">{plan.name}</h3>
                  <p className={cn("text-sm leading-6", plan.isPopular ? "text-white/85" : "text-muted-foreground")}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-8">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black">
                      {isFreePlan ? "Free" : formatPrice(displayPrice, plan.currency)}
                    </span>
                    {!isFreePlan ? (
                      <span className={cn("mb-1 text-sm", plan.isPopular ? "text-white/80" : "text-muted-foreground")}>
                        /{billingCycle === "yearly" ? "year" : "month"}
                      </span>
                    ) : null}
                  </div>
                  {!isFreePlan && billingCycle === "yearly" && savings ? (
                    <div className="mt-3 space-y-1">
                      <p className={cn("text-xs font-semibold uppercase tracking-[0.14em]", plan.isPopular ? "text-white/90" : "text-cyan-600")}>
                        Save {savings.savingsPercent}% yearly
                      </p>
                      <p className={cn("text-sm", plan.isPopular ? "text-white/75" : "text-muted-foreground")}>
                        {formatPrice(savings.monthlyEquivalent, plan.currency)}/month billed annually
                      </p>
                    </div>
                  ) : null}

                  {!isFreePlan ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-left",
                          billingCycle === "monthly"
                            ? plan.isPopular
                              ? "border-white/30 bg-white/12"
                              : "border-primary-blue/25 bg-primary-blue/10"
                            : "border-white/10 bg-black/10"
                        )}
                      >
                        <p className={cn("text-[11px] font-semibold uppercase tracking-[0.14em]", plan.isPopular ? "text-white/70" : "text-muted-foreground")}>
                          Monthly
                        </p>
                        <p className="mt-1 text-sm font-bold">
                          {formatPrice(plan.price, plan.currency)}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-left",
                          billingCycle === "yearly"
                            ? plan.isPopular
                              ? "border-white/30 bg-white/12"
                              : "border-primary-blue/25 bg-primary-blue/10"
                            : "border-white/10 bg-black/10"
                        )}
                      >
                        <p className={cn("text-[11px] font-semibold uppercase tracking-[0.14em]", plan.isPopular ? "text-white/70" : "text-muted-foreground")}>
                          Yearly
                        </p>
                        <p className="mt-1 text-sm font-bold">
                          {resolvedYearlyPrice ? formatPrice(resolvedYearlyPrice, plan.currency) : "Contact us"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-6">
                      <div
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                          plan.isPopular ? "bg-white/20" : "bg-primary-blue/10 text-primary-blue"
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className={plan.isPopular ? "text-white" : "text-muted-foreground"}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={cta.href}
                  className={cn(
                    "rounded-2xl px-4 py-3.5 text-center text-sm font-semibold transition-colors",
                    plan.isPopular
                      ? "bg-white text-primary-blue hover:bg-white/95"
                      : "bg-primary-blue text-white hover:bg-primary-blue/90"
                  )}
                >
                  {cta.label}
                </Link>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Need a closer feature breakdown?
          <Link href="/pricing" className="ml-1 font-medium text-primary-blue hover:underline">
            Compare all plan details
          </Link>
        </p>
      </div>
    </section>
  );
}
