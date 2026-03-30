"use client";
import Link from "next/link";
import { useState } from "react";
import { Brain, Twitter, Github, Linkedin, Youtube, ArrowRight, Sparkles } from "lucide-react";

const footerLinks = {
  learn: [
    { label: "All Courses", href: "/courses" },
    { label: "Learning Paths", href: "/paths" },
    { label: "Free Courses", href: "/courses?price=free" },
    { label: "Certificates", href: "/certificates" },
    { label: "Blog", href: "/blog" },
  ],
  categories: [
    { label: "Machine Learning", href: "/courses?category=machine-learning" },
    { label: "Deep Learning", href: "/courses?category=deep-learning" },
    { label: "Generative AI", href: "/courses?category=generative-ai" },
    { label: "NLP", href: "/courses?category=nlp" },
    { label: "Computer Vision", href: "/courses?category=computer-vision" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleNewsletter(event: React.FormEvent) {
    event.preventDefault();
    if (!email || status === "saving") return;

    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to subscribe right now.");
      }

      setStatus("success");
      setMessage(data.message || "Subscription confirmed. Check your inbox for the next issue.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to subscribe right now.");
    }
  }

  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="border-b border-border/70 bg-blue-50/60">
        <div className="section-frame py-14">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                Newsletter
              </div>
              <h3 className="text-2xl font-bold text-foreground">Stay current with AI without the noise</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Get weekly updates on new courses, practical guides, and AI trends that matter for real work.
              </p>
            </div>

            {status === "success" ? (
              <div className="rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-sm font-medium text-emerald-700 shadow-sm">
                {message}
              </div>
            ) : (
              <div className="w-full max-w-md">
                <form onSubmit={handleNewsletter} className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") {
                        setStatus("idle");
                        setMessage("");
                      }
                    }}
                    placeholder="your@email.com"
                    required
                    className="input-surface flex-1"
                  />
                  <button type="submit" className="action-primary shrink-0" disabled={status === "saving"}>
                    {status === "saving" ? "Joining..." : "Subscribe"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
                {status === "error" && message ? (
                  <p className="mt-2 text-sm text-rose-600">{message}</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section-frame py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">
                AI Learning <span className="text-blue-600">Class</span>
              </span>
            </Link>
            <p className="mb-6 text-sm leading-6 text-muted-foreground">
              Professional AI education designed for learners who want structure, depth, and real-world outcomes.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: Twitter, href: "https://twitter.com" },
                { icon: Github, href: "https://github.com" },
                { icon: Linkedin, href: "https://linkedin.com" },
                { icon: Youtube, href: "https://youtube.com" },
              ].map(({ icon: Icon, href }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-foreground">Learn</h4>
            <ul className="space-y-3">
              {footerLinks.learn.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-blue-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-foreground">Categories</h4>
            <ul className="space-y-3">
              {footerLinks.categories.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-blue-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-foreground">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-blue-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="section-frame flex flex-col items-center justify-between gap-4 py-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-muted-foreground">
            Copyright {new Date().getFullYear()} AI Learning Class. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Payments secured by</span>
            {["Stripe", "PayPal", "Paystack"].map((provider) => (
              <span
                key={provider}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground"
              >
                {provider}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
