"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { X, ShoppingCart, ArrowRight, Shield, Tag } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, total } = useCartStore();
  const [couponCode, setCouponCode] = useState("");
  const cartTotal = total();
  const normalizedCouponCode = couponCode.trim().toUpperCase();
  const checkoutHref = useMemo(
    () =>
      normalizedCouponCode
        ? `/checkout?coupon=${encodeURIComponent(normalizedCouponCode)}`
        : "/checkout",
    [normalizedCouponCode]
  );

  return (
    <div className="site-shell">
      <Navbar />
      <div className="pb-20 pt-8">
        <div className="section-frame">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                <ShoppingCart className="h-4 w-4" />
                Shopping cart
              </div>
              <h1 className="text-3xl font-black text-foreground">Review your courses</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "items"} ready for checkout.
              </p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="surface-card mx-auto max-w-2xl px-6 py-16 text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50">
                <ShoppingCart className="h-12 w-12 text-blue-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-foreground">Your cart is empty</h2>
              <p className="mb-8 text-muted-foreground">Explore curated AI programs and add the courses you want to start next.</p>
              <Link href="/courses" className="action-primary">
                Browse courses
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {items.map((item) => (
                  <div key={item.courseId} className="surface-card flex items-start gap-4 p-5">
                    {item.thumbnailUrl && (
                      <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl bg-blue-50">
                        <Image src={item.thumbnailUrl} alt={item.title} fill className="object-cover" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-base font-semibold text-foreground">{item.title}</h3>
                      {item.instructorName && (
                        <p className="mt-1 text-sm text-muted-foreground">{item.instructorName}</p>
                      )}
                      <div className="mt-4 flex items-center gap-3 text-sm">
                        <span className="font-bold text-foreground">{formatPrice(item.price)}</span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-muted-foreground line-through">{formatPrice(item.originalPrice)}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.courseId)}
                      className="rounded-xl border border-border p-2 text-muted-foreground hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-1">
                <div className="surface-card sticky top-24 p-6">
                  <h2 className="text-lg font-bold text-foreground">Order summary</h2>

                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium text-foreground">{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Savings</span>
                      <span className="font-medium text-emerald-600">
                        -
                        {formatPrice(
                          items.reduce((sum, item) => sum + (item.originalPrice || item.price) - item.price, 0)
                        )}
                      </span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="text-2xl font-black text-foreground">{formatPrice(cartTotal)}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                        placeholder="Coupon code"
                        className="input-surface w-full pl-9"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCouponCode(normalizedCouponCode)}
                      className="action-secondary px-4 py-3"
                    >
                      Apply
                    </button>
                  </div>
                  {normalizedCouponCode ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Coupon <span className="font-semibold text-foreground">{normalizedCouponCode}</span> will be verified during checkout.
                    </p>
                  ) : null}

                  <Link href={checkoutHref} className="action-primary mt-6 flex w-full">
                    Proceed to checkout
                  </Link>

                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    Secure checkout and 30-day money-back guarantee
                  </div>

                  <div className="mt-5 border-t border-border pt-5">
                    <p className="mb-3 text-center text-xs text-muted-foreground">Accepted payment methods</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {["Visa", "Mastercard", "PayPal", "Paystack", "M-Pesa"].map((m) => (
                        <span
                          key={m}
                          className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
