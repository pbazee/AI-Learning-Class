"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { useCartStore } from "@/store/cart";
import { formatPrice, cn } from "@/lib/utils";
import { Shield, CreditCard, Check, Lock, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type PaymentMethod = "stripe" | "paypal" | "paystack";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore();
  const cartTotal = total();
  const [method, setMethod] = useState<PaymentMethod>("stripe");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", country: "US" });

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);

    if (method === "stripe") {
      await new Promise((r) => setTimeout(r, 2000));
    } else {
      await new Promise((r) => setTimeout(r, 1500));
    }

    setProcessing(false);
    setSuccess(true);
    clearCart();
  }

  if (success) {
    return (
      <div className="site-shell">
        <Navbar />
        <div className="flex min-h-screen items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="surface-card w-full max-w-md p-8 text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="mb-3 text-3xl font-black text-foreground">Payment successful</h1>
            <p className="mb-2 text-muted-foreground">You now have access to your courses and learning dashboard.</p>
            <p className="mb-8 text-sm text-muted-foreground">A receipt has been sent to your email.</p>
            <div className="flex flex-col gap-3">
              <Link href="/dashboard" className="action-primary w-full">
                Go to my courses
              </Link>
              <Link href="/courses" className="action-secondary w-full">
                Continue browsing
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <Navbar />
      <div className="pb-20 pt-8">
        <div className="section-frame">
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              <Lock className="h-4 w-4" />
              Secure checkout
            </div>
            <h1 className="text-3xl font-black text-foreground">Complete your order</h1>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <form onSubmit={handleCheckout} className="space-y-6">
                <div className="surface-card p-6">
                  <h2 className="mb-5 text-base font-bold text-foreground">Contact information</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-surface w-full"
                        placeholder="Your name"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input-surface w-full"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Country</label>
                      <select
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="input-surface w-full cursor-pointer"
                      >
                        <option value="US">United States</option>
                        <option value="GB">United Kingdom</option>
                        <option value="NG">Nigeria</option>
                        <option value="GH">Ghana</option>
                        <option value="KE">Kenya</option>
                        <option value="ZA">South Africa</option>
                        <option value="IN">India</option>
                        <option value="CA">Canada</option>
                        <option value="AU">Australia</option>
                        <option value="DE">Germany</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="surface-card p-6">
                  <h2 className="mb-5 text-base font-bold text-foreground">Payment method</h2>

                  <div className="mb-6 grid grid-cols-3 gap-3">
                    {([
                      { id: "stripe", label: "Credit Card", sub: "Visa, Mastercard, Amex" },
                      { id: "paypal", label: "PayPal", sub: "Pay via PayPal" },
                      { id: "paystack", label: "Paystack", sub: "Africa and global" },
                    ] as const).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={cn(
                          "rounded-2xl border p-3 text-left transition-all",
                          method === m.id
                            ? "border-blue-300 bg-blue-50 shadow-sm"
                            : "border-border bg-background hover:border-blue-200"
                        )}
                      >
                        <div className="mb-0.5 text-sm font-semibold text-foreground">{m.label}</div>
                        <div className="text-xs text-muted-foreground">{m.sub}</div>
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {method === "stripe" && (
                      <motion.div
                        key="stripe"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Card number</label>
                          <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="1234 5678 9012 3456"
                              maxLength={19}
                              className="input-surface w-full pl-10 font-mono"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Expiry date</label>
                            <input type="text" placeholder="MM / YY" maxLength={7} className="input-surface w-full font-mono" />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">CVV</label>
                            <input type="password" placeholder="***" maxLength={4} className="input-surface w-full font-mono" />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name on card</label>
                          <input type="text" placeholder="As it appears on card" className="input-surface w-full" />
                        </div>
                      </motion.div>
                    )}

                    {method === "paypal" && (
                      <motion.div
                        key="paypal"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl border border-border bg-muted/40 px-5 py-8 text-center"
                      >
                        <p className="text-sm text-muted-foreground">
                          You will be redirected to PayPal to complete the purchase securely.
                        </p>
                      </motion.div>
                    )}

                    {method === "paystack" && (
                      <motion.div
                        key="paystack"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl border border-border bg-muted/40 px-5 py-8 text-center"
                      >
                        <p className="text-sm text-muted-foreground">
                          Pay with M-Pesa, bank transfer, USSD, or card through Paystack.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="action-primary flex w-full justify-center py-4 text-base"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5" />
                      Pay {formatPrice(cartTotal)}
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  256-bit SSL encryption and 30-day money-back guarantee
                </div>
              </form>
            </div>

            <div className="lg:col-span-2">
              <div className="surface-card sticky top-24 p-6">
                <h2 className="mb-5 text-base font-bold text-foreground">Order summary</h2>

                <div className="mb-6 space-y-4">
                  {items.map((item) => (
                    <div key={item.courseId} className="flex items-start gap-3">
                      {item.thumbnailUrl && (
                        <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl bg-blue-50">
                          <Image src={item.thumbnailUrl} alt={item.title} fill className="object-cover" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <p className="text-xs text-muted-foreground line-through">{formatPrice(item.originalPrice)}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{formatPrice(item.price)}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-4 space-y-2 border-y border-border py-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Savings</span>
                    <span className="text-emerald-600">
                      -
                      {formatPrice(items.reduce((s, i) => s + (i.originalPrice || i.price) - i.price, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-foreground">$0.00</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-black text-foreground">{formatPrice(cartTotal)}</span>
                </div>

                <div className="mt-5 space-y-2 border-t border-border pt-5">
                  {[
                    "Lifetime access to purchased courses",
                    "AI learning copilot included",
                    "Download resources and code",
                    "Certificate of completion",
                    "30-day money-back guarantee",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
