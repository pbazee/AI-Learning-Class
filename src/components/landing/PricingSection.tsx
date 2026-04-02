"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { formatPrice, cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types";

export function PricingSection({ plans }: { plans: SubscriptionPlan[] }) {
  const [yearly, setYearly] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const { toast } = useToast();

  if (plans.length === 0) {
    return null;
  }

  async function startPlanCheckout(plan: SubscriptionPlan) {
    try {
      setCheckoutPlanId(plan.id);
      const planPrice = yearly && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
      const origin = window.location.origin;
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              title: yearly && plan.yearlyPrice ? `${plan.name} Plan (Yearly)` : `${plan.name} Plan`,
              price: planPrice,
            },
          ],
          successUrl: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}/pricing`,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "Unable to start checkout right now.");
      }

      window.location.assign(payload.url);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to start checkout right now.", "error");
      setCheckoutPlanId(null);
    }
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
            Invest in your <span className="gradient-text">AI growth</span>
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground">
            Choose a plan that matches how you learn, from individual course exploration to full career acceleration.
          </p>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
            <button
              onClick={() => setYearly(false)}
              className={cn(
                "rounded-xl px-5 py-2 text-sm font-medium",
                !yearly ? "bg-primary-blue text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium",
                yearly ? "bg-primary-blue text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  yearly ? "bg-white/20" : "bg-primary-blue/10 text-primary-blue"
                )}
              >
                Save 30%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "relative flex flex-col rounded-[30px] border p-8 shadow-sm",
                plan.isPopular
                  ? "border-primary-blue bg-primary-blue text-white shadow-[0_24px_60px_rgba(59,130,246,0.24)]"
                  : "bg-card text-foreground"
              )}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary-blue">
                  Most popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="mb-1 text-xl font-bold">{plan.name}</h3>
                <p className={cn("text-sm leading-6", plan.isPopular ? "text-white/80" : "text-muted-foreground")}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black">
                    {formatPrice(yearly && plan.yearlyPrice ? Math.round(plan.yearlyPrice / 12) : plan.price)}
                  </span>
                  <span className={cn("mb-1 text-sm", plan.isPopular ? "text-white/80" : "text-muted-foreground")}>
                    /month
                  </span>
                </div>
                {yearly && plan.yearlyPrice && (
                  <p className={cn("mt-2 text-xs", plan.isPopular ? "text-white/80" : "text-primary-blue")}>
                    Billed {formatPrice(plan.yearlyPrice)}/year
                  </p>
                )}
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm leading-6">
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full",
                        plan.isPopular ? "bg-white/20" : "bg-primary-blue/10 text-primary-blue"
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className={plan.isPopular ? "text-white" : "text-muted-foreground"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => void startPlanCheckout(plan)}
                disabled={checkoutPlanId === plan.id}
                className={cn(
                  "rounded-2xl px-4 py-3.5 text-center text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-70",
                  plan.isPopular
                    ? "bg-white text-primary-blue hover:bg-primary-blue/10"
                    : "border border-primary-blue/20 bg-primary-blue/10 text-primary-blue hover:border-primary-blue/30 hover:bg-primary-blue/15"
                )}
              >
                {checkoutPlanId === plan.id ? "Starting checkout..." : `Get started with ${plan.name}`}
              </button>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          All plans include a 14-day money-back guarantee.
          <Link href="/pricing" className="ml-1 font-medium text-primary-blue hover:underline">
            Compare full features
          </Link>
        </p>
      </div>
    </section>
  );
}
