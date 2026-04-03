"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types";

const planCtaCopy: Record<string, { href: string; label: string }> = {
  free: { href: "/courses?price=free", label: "Start Free Plan" },
  pro: { href: "/checkout?plan=pro", label: "Choose Pro" },
  teams: { href: "/checkout?plan=teams", label: "Choose Teams" },
};

export function PricingSection({ plans }: { plans: SubscriptionPlan[] }) {
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
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan, index) => {
            const cta = planCtaCopy[plan.slug] ?? { href: `/checkout?plan=${plan.slug}`, label: `Choose ${plan.name}` };
            const isFreePlan = plan.price === 0;

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
                      {isFreePlan ? "Free" : formatPrice(plan.price, plan.currency)}
                    </span>
                    {!isFreePlan ? (
                      <span className={cn("mb-1 text-sm", plan.isPopular ? "text-white/80" : "text-muted-foreground")}>
                        /month
                      </span>
                    ) : null}
                  </div>
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
