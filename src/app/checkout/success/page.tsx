"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Check, BookOpen, Award, ArrowRight, Sparkles, Mail } from "lucide-react";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setConfetti(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="site-shell">
      <Navbar />

      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: Math.random() * window.innerWidth,
                y: -20,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: window.innerHeight + 20,
                rotate: Math.random() * 720 - 360,
                opacity: 0,
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 1.5,
                ease: "linear",
              }}
              className="absolute h-2 w-2 rounded-sm"
              style={{
                background: ["#007bff", "#0056d2", "#60a5fa", "#34d399", "#f59e0b"][
                  Math.floor(Math.random() * 5)
                ],
              }}
            />
          ))}
        </div>
      )}

      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.35 }}
          className="w-full max-w-xl text-center"
        >
          <div className="surface-card p-8 sm:p-10">
            <div className="relative mb-8 inline-block">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-50">
                <Check className="h-12 w-12 text-blue-600" />
              </div>
              <div className="absolute -right-1 -top-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>

            <h1 className="mb-4 text-3xl font-black text-foreground sm:text-4xl">
              Enrollment <span className="gradient-text">confirmed</span>
            </h1>
            <p className="mb-2 text-lg text-muted-foreground">
              Your payment was successful and your courses are ready.
            </p>
            <p className="mb-8 text-sm text-muted-foreground">
              We emailed your receipt and enrollment confirmation.
              {sessionId && (
                <span className="mt-1 block font-mono text-xs text-muted-foreground">
                  Order: {sessionId.slice(0, 20)}...
                </span>
              )}
            </p>

            <div className="mb-8 rounded-[28px] border border-blue-100 bg-blue-50/60 p-6 text-left">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-blue-700">What happens next</h3>
              <div className="space-y-4">
                {[
                  {
                    icon: Mail,
                    title: "Check your inbox",
                    desc: "Your confirmation and receipt are already on the way.",
                  },
                  {
                    icon: BookOpen,
                    title: "Start learning immediately",
                    desc: "All purchased courses are now available in your dashboard.",
                  },
                  {
                    icon: Award,
                    title: "Earn your certificate",
                    desc: "Complete the course path to unlock a shareable certificate.",
                  },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/dashboard" className="action-primary">
                <BookOpen className="h-5 w-5" />
                Go to my courses
              </Link>
              <Link href="/courses" className="action-secondary">
                Browse more
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
