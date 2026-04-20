"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, Lock, Shield, Tag, X } from "lucide-react";
import { CountryCombobox } from "@/components/checkout/CountryCombobox";
import { NavbarClient } from "@/components/layout/NavbarClient";
import { type BillingCycle, getBillingCycleLabel } from "@/lib/site";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

type PaymentMethod = "stripe" | "paypal" | "paystack";

type QuoteItem = {
  courseId?: string;
  title: string;
  price: number;
  thumbnailUrl?: string;
  kind: "course" | "plan";
};

type CheckoutQuote = {
  currency: string;
  items: QuoteItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  appliedCouponCode: string | null;
  appliedCouponDescription: string | null;
  planSlug: string | null;
  billingCycle: BillingCycle | null;
};

type AccountProfileResponse = {
  profile?: {
    email?: string;
    name?: string | null;
    countryCode?: string;
  };
};

function StripeMark() {
  return <span className="text-sm font-black tracking-[0.08em] text-[#635BFF]">Stripe</span>;
}

function PayPalMark() {
  return (
    <span className="text-sm font-black tracking-[0.04em]">
      <span className="text-[#003087]">Pay</span>
      <span className="text-[#009CDE]">Pal</span>
    </span>
  );
}

function PaystackMark() {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-black text-[#0BAF62]">
      <span className="h-2.5 w-2.5 rounded-full bg-[#0BAF62]" />
      Paystack
    </span>
  );
}

const paymentOptions: Array<{
  id: PaymentMethod;
  label: string;
  sublabel: string;
  logo: ReactNode;
}> = [
  {
    id: "stripe",
    label: "Stripe",
    sublabel: "Cards and fast checkout",
    logo: <StripeMark />,
  },
  {
    id: "paypal",
    label: "PayPal",
    sublabel: "Pay with PayPal balance or card",
    logo: <PayPalMark />,
  },
  {
    id: "paystack",
    label: "Paystack",
    sublabel: "Card, bank, M-Pesa, and more",
    logo: <PaystackMark />,
  },
];

const timezoneCountryMap: Array<{ code: string; pattern: RegExp }> = [
  { code: "KE", pattern: /Africa\/Nairobi/i },
  { code: "UG", pattern: /Africa\/Kampala/i },
  { code: "TZ", pattern: /Africa\/Dar_es_Salaam/i },
  { code: "RW", pattern: /Africa\/Kigali/i },
  { code: "NG", pattern: /Africa\/Lagos/i },
  { code: "GH", pattern: /Africa\/Accra/i },
  { code: "ZA", pattern: /Africa\/Johannesburg/i },
];

function inferCheckoutCountry() {
  if (typeof window === "undefined") {
    return null;
  }

  const locale = typeof navigator !== "undefined" ? navigator.language : "";
  const localeCountry = locale.match(/(?:-|_)([A-Z]{2})$/i)?.[1]?.toUpperCase();

  if (localeCountry) {
    return localeCountry;
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezoneCountryMap.find((entry) => entry.pattern.test(timezone))?.code ?? null;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const { items } = useCartStore();
  const planSlug = searchParams.get("plan");
  const billingParam = searchParams.get("billing");
  const couponParam = searchParams.get("coupon")?.trim().toUpperCase() || "";
  const [method, setMethod] = useState<PaymentMethod>("stripe");
  const [processing, setProcessing] = useState(false);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState(couponParam);
  const [couponCode, setCouponCode] = useState(couponParam);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    billingParam === "yearly" ? "yearly" : "monthly"
  );
  const [formData, setFormData] = useState({ name: "", email: "", country: "US" });

  const cartSavings = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Math.max(0, (item.originalPrice || item.price) - item.price),
        0
      ),
    [items]
  );
  const requestItems = useMemo(
    () =>
      items.map((item) => ({
        courseId: item.courseId,
        title: item.title,
        price: item.price,
        thumbnailUrl: item.thumbnailUrl,
      })),
    [items]
  );
  const isPlanCheckout = Boolean(planSlug);
  const availablePaymentOptions = paymentOptions;
  const normalizedCouponInput = couponInput.trim().toUpperCase();

  useEffect(() => {
    setCouponInput(couponParam);
    setCouponCode(couponParam);
  }, [couponParam]);

  useEffect(() => {
    setBillingCycle(billingParam === "yearly" ? "yearly" : "monthly");
  }, [billingParam]);

  useEffect(() => {
    const inferredCountry = inferCheckoutCountry();

    if (!inferredCountry) {
      return;
    }

    setFormData((current) =>
      current.country === "US" ? { ...current, country: inferredCountry } : current
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/account/profile", {
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json().catch(() => null)) as AccountProfileResponse | null;
        const profile = payload?.profile;

        if (!profile || cancelled) {
          return;
        }

        setFormData((current) => ({
          name: current.name || profile.name || "",
          email: current.email || profile.email || "",
          country:
            current.country && current.country !== "US"
              ? current.country
              : profile.countryCode || current.country,
        }));
      } catch {
        // Profile hydration should never block checkout.
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadQuote() {
      setQuoteLoading(true);
      setQuoteError(null);

      try {
        const response = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planSlug,
            billingCycle,
            items: requestItems,
            method,
            country: formData.country,
            couponCode,
          }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.quote) {
          throw new Error(payload?.error || "Unable to load your checkout summary.");
        }

        if (!cancelled) {
          setQuote(payload.quote);
        }
      } catch (error) {
        if (!cancelled) {
          setQuoteError(
            error instanceof Error
              ? error.message
              : "Unable to load your checkout summary."
          );
        }
      } finally {
        if (!cancelled) {
          setQuoteLoading(false);
        }
      }
    }

    void loadQuote();

    return () => {
      cancelled = true;
    };
  }, [billingCycle, couponCode, formData.country, method, planSlug, requestItems]);

  async function handleCheckout(event: React.FormEvent) {
    event.preventDefault();

    if (!quote) {
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method,
          planSlug,
          billingCycle,
          items: requestItems,
          customerName: formData.name,
          customerEmail: formData.email,
          country: formData.country,
          couponCode,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to start checkout right now.");
      }

      if (!payload?.url) {
        throw new Error("Unable to start checkout right now.");
      }

      window.location.assign(payload.url);
    } catch (error) {
      setQuoteError(
        error instanceof Error ? error.message : "Unable to start checkout right now."
      );
      setProcessing(false);
    }
  }

  const isFreePlan = quote?.planSlug === "free" || (quote?.total ?? 0) <= 0;
  const hasCheckoutContent = Boolean(planSlug) || items.length > 0;

  function handleApplyCoupon() {
    setQuoteError(null);
    setCouponCode(normalizedCouponInput);
  }

  function handleRemoveCoupon() {
    setQuoteError(null);
    setCouponInput("");
    setCouponCode("");
  }

  return (
    <div className="site-shell overflow-x-hidden">
      <div className="pb-16 pt-6 sm:pt-8">
        <div className="section-frame">
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-blue/20 bg-primary-blue/10 px-4 py-2 text-sm font-semibold text-primary-blue">
              <Lock className="h-4 w-4" />
              Secure checkout
            </div>
            <h1 className="text-3xl font-black text-foreground">Complete your order</h1>
          </div>

          {!hasCheckoutContent ? (
            <div className="surface-card p-8 text-center">
              <h2 className="text-2xl font-black text-foreground">Your checkout is empty</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Add a course to your cart or pick a plan to continue.
              </p>
              <Link href="/courses" className="action-primary mt-6 inline-flex">
                Browse courses
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0">
                <form onSubmit={handleCheckout} className="space-y-6">
                  <div className="surface-card p-5 sm:p-6">
                    <h2 className="mb-5 text-base font-bold text-foreground">
                      Contact information
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                          Full name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(event) =>
                            setFormData((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          className="input-surface w-full"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(event) =>
                            setFormData((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          className="input-surface w-full"
                          placeholder="you@example.com"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <CountryCombobox
                          value={formData.country}
                          onChange={(country) =>
                            setFormData((current) => ({ ...current, country }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {!isFreePlan ? (
                    <div className="surface-card p-5 sm:p-6">
                      {isPlanCheckout ? (
                        <div className="mb-5">
                          <h2 className="mb-3 text-base font-bold text-foreground">Billing cycle</h2>
                          <div className="grid grid-cols-2 gap-3">
                            {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => (
                              <button
                                key={cycle}
                                type="button"
                                onClick={() => setBillingCycle(cycle)}
                                className={cn(
                                  "rounded-2xl border px-4 py-4 text-left transition-all",
                                  billingCycle === cycle
                                    ? "border-primary-blue bg-primary-blue/8 shadow-sm"
                                    : "border-border bg-background hover:border-primary-blue/30"
                                )}
                              >
                                <p className="text-sm font-semibold text-foreground">
                                  {getBillingCycleLabel(cycle)}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                  {cycle === "yearly"
                                    ? "Lower monthly effective cost when yearly pricing is configured."
                                    : "Flexible monthly access and renewal cadence."}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <h2 className="mb-5 text-base font-bold text-foreground">Payment method</h2>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {availablePaymentOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setMethod(option.id)}
                            className={cn(
                              "rounded-2xl border p-4 text-left transition-all",
                              method === option.id
                                ? "border-primary-blue bg-primary-blue/5 shadow-sm"
                                : "border-border bg-background hover:border-primary-blue/30"
                            )}
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              {option.logo}
                              <span
                                className={cn(
                                  "h-4 w-4 rounded-full border-2",
                                  method === option.id
                                    ? "border-primary-blue bg-primary-blue"
                                    : "border-border bg-transparent"
                                )}
                              />
                            </div>
                            <div className="text-sm font-semibold text-foreground">
                              {option.label}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-muted-foreground">
                              {option.sublabel}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="mt-5 rounded-2xl border border-border bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
                        {isPlanCheckout
                          ? method === "stripe"
                            ? `Stripe keeps ${billingCycle} renewals in sync automatically with your active billing period.`
                            : `PayPal and Paystack activate your current ${billingCycle} access period and return here for access confirmation after payment.`
                          : method === "stripe"
                            ? "You will be redirected to Stripe Checkout to complete payment securely."
                            : method === "paypal"
                              ? "You will be redirected to PayPal to approve and complete payment."
                            : `You will be redirected to Paystack Checkout in ${quote?.currency ?? "your selected"} currency so eligible regional methods like mobile money can appear when your account and country support them.`}
                      </div>

                      <div className="mt-5 rounded-2xl border border-border bg-background px-4 py-4">
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          <Tag className="h-4 w-4" />
                          Coupon or referral code
                        </label>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                            placeholder="LAUNCH50"
                            className="input-surface flex-1"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            className="action-secondary justify-center px-5 py-3"
                          >
                            Apply code
                          </button>
                          {couponCode ? (
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/30"
                            >
                              <X className="h-4 w-4" />
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Enter a manual coupon code or referral reward and apply it before checkout.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="surface-card p-5 sm:p-6">
                      <h2 className="mb-2 text-base font-bold text-foreground">
                        Free plan selected
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        No payment is required for the Free plan. Continue to browse the free
                        course catalog.
                      </p>
                    </div>
                  )}

                  {quoteError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                      {quoteError}
                    </div>
                  ) : null}

                  {isFreePlan ? (
                    <Link
                      href="/courses?price=free"
                      className="action-primary flex w-full justify-center py-4 text-base"
                    >
                      Explore free courses
                    </Link>
                  ) : (
                    <button
                      type="submit"
                      disabled={processing || quoteLoading || !quote}
                      className="action-primary flex w-full justify-center py-4 text-base"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Redirecting
                        </>
                      ) : (
                        <>
                          <Lock className="h-5 w-5" />
                          {isPlanCheckout
                            ? `${method === "stripe" ? "Start" : "Activate"} ${getBillingCycleLabel(quote?.billingCycle ?? billingCycle)} ${quote?.planSlug === "teams" ? "Teams" : "Pro"} ${method === "stripe" ? "Subscription" : "Plan"}`
                            : `Pay ${quote ? formatPrice(quote.total, quote.currency) : ""}`}
                        </>
                      )}
                    </button>
                  )}

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    SSL encryption, referral discount support, and trusted checkout gateways
                  </div>
                </form>
              </div>

              <div className="min-w-0">
                <div className="surface-card p-5 sm:p-6 lg:sticky lg:top-24">
                  <h2 className="mb-5 text-base font-bold text-foreground">Order summary</h2>

                  {quoteLoading ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading your checkout summary...
                    </div>
                  ) : quote ? (
                    <>
                      <div className="mb-6 space-y-4">
                        {quote.items.map((item) => (
                          <div
                            key={`${item.kind}-${item.courseId || item.title}`}
                            className="flex items-start gap-3"
                          >
                            {item.thumbnailUrl ? (
                              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl bg-primary-blue/10">
                                <Image
                                  src={item.thumbnailUrl}
                                  alt={item.title}
                                  fill
                                  quality={75}
                                  sizes="80px"
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
                                <Shield className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-sm font-medium text-foreground">
                                {item.title}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {item.kind === "plan"
                                  ? `${getBillingCycleLabel(quote.billingCycle ?? billingCycle)} subscription`
                                  : "Course access"}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              {formatPrice(item.price, quote.currency)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {quote.appliedCouponCode ? (
                        <div className="mb-5 rounded-2xl border border-primary-blue/20 bg-primary-blue/10 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue">
                            Discount applied
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {quote.appliedCouponCode}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {quote.appliedCouponDescription ||
                              "Your coupon or referral reward has been applied to this order."}
                          </p>
                        </div>
                      ) : null}

                      <div className="mb-4 space-y-2 border-y border-border py-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="text-foreground">
                            {formatPrice(quote.subtotal, quote.currency)}
                          </span>
                        </div>
                        {quote.currency === "USD" && cartSavings > 0 ? (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Catalog savings</span>
                            <span className="text-emerald-600">
                              -{formatPrice(cartSavings, quote.currency)}
                            </span>
                          </div>
                        ) : null}
                        {quote.discountAmount > 0 ? (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="text-emerald-600">
                              -{formatPrice(quote.discountAmount, quote.currency)}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax</span>
                          <span className="text-foreground">
                            {formatPrice(0, quote.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-2xl font-black text-foreground">
                          {formatPrice(quote.total, quote.currency)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
                      We couldn&apos;t load your order summary right now.
                    </div>
                  )}

                  <div className="mt-5 space-y-2 border-t border-border pt-5">
                    {[
                      "Premium classroom access on desktop and mobile",
                      "Instant checkout with Stripe, PayPal, or Paystack",
                      "Coupon and referral discounts supported during checkout",
                      "Certificates included on eligible plans and courses",
                    ].map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
