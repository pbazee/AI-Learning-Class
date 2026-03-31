"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        throw error;
      }

      setStatus("success");
      setMessage("Password reset instructions have been sent to your email address.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to send reset instructions.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Button asChild variant="ghost" size="sm" className="mb-4 w-fit px-0 text-blue-600 hover:bg-transparent hover:text-blue-700">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </Button>
            <CardTitle>Forgot your password?</CardTitle>
            <CardDescription>
              Enter your email and we&apos;ll send you reset instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-password-email" className="mb-2 block text-sm font-semibold text-foreground">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="forgot-password-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-blue-400/30"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={status === "loading"}>
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Reset Link
                  </>
                ) : (
                  "Send Reset Instructions"
                )}
              </Button>
            </form>

            {message ? (
              <p
                className={`mt-4 text-sm ${
                  status === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {message}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
