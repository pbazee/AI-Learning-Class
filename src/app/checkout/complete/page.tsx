"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { NavbarClient } from "@/components/layout/NavbarClient";

export default function CheckoutCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gateway = searchParams.get("gateway");
  const stripeSessionId = searchParams.get("session_id");
  const paypalOrderId = searchParams.get("token");
  const paystackReference = searchParams.get("reference") || searchParams.get("trxref");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finalizeCheckout() {
      try {
        if (gateway === "stripe" && stripeSessionId) {
          const response = await fetch("/api/stripe/confirm", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessionId: stripeSessionId }),
          });
          const payload = await response.json().catch(() => null);

          if (!response.ok || !payload?.success) {
            throw new Error(payload?.error || "Unable to confirm your Stripe payment.");
          }

          if (!cancelled) {
            router.replace(`/checkout/success?gateway=stripe&session_id=${encodeURIComponent(payload.sessionId)}`);
          }
          return;
        }

        if (gateway === "paypal" && paypalOrderId) {
          const response = await fetch("/api/paypal/capture", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ orderId: paypalOrderId }),
          });
          const payload = await response.json().catch(() => null);

          if (!response.ok || !payload?.success) {
            throw new Error(payload?.error || "Unable to confirm your PayPal payment.");
          }

          if (!cancelled) {
            router.replace(`/checkout/success?gateway=paypal&session_id=${encodeURIComponent(payload.sessionId)}`);
          }
          return;
        }

        if (gateway === "paystack" && paystackReference) {
          const response = await fetch("/api/paystack/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reference: paystackReference }),
          });
          const payload = await response.json().catch(() => null);

          if (!response.ok || !payload?.success) {
            throw new Error(payload?.error || "Unable to verify your Paystack payment.");
          }

          if (!cancelled) {
            router.replace(`/checkout/success?gateway=paystack&session_id=${encodeURIComponent(payload.sessionId)}`);
          }
          return;
        }

        throw new Error("We could not detect a supported checkout completion flow.");
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to complete checkout.");
        }
      }
    }

    void finalizeCheckout();

    return () => {
      cancelled = true;
    };
  }, [gateway, paystackReference, paypalOrderId, router, stripeSessionId]);

  return (
    <div className="site-shell">
      <NavbarClient />
      <div className="flex min-h-[calc(100vh-var(--navbar-height))] items-center justify-center px-4 py-16">
        <div className="surface-card w-full max-w-lg p-8 text-center">
          {error ? (
            <>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-300">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-black text-foreground">Checkout confirmation failed</h1>
              <p className="mt-3 text-sm text-muted-foreground">{error}</p>
              <Link href="/checkout" className="action-primary mt-6 inline-flex">
                Return to checkout
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-blue/10 text-primary-blue">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h1 className="text-2xl font-black text-foreground">Finalizing your payment</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We&apos;re confirming your {gateway || "payment"} transaction and will take you to the success page automatically.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
