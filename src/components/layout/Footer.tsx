"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Brain, ArrowRight, Sparkles,
  Twitter, Linkedin, Youtube, Instagram, Facebook, Music2,
  Mail, Phone, MapPin, MessageCircle,
} from "lucide-react";

type SiteSettings = {
  supportEmail?: string;
  supportPhone?: string;
  whatsappNumber?: string;
  physicalAddress?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  linkedInUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
};

const quickLinks = [
  { label: "About Us", href: "/about" },
  { label: "Affiliate Program", href: "/affiliate" },
  { label: "Referral Rewards", href: "/dashboard/referrals" },
  { label: "Blog", href: "/blog" },
  { label: "Reviews", href: "/reviews" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact Us", href: "/contact" },
];

const learnLinks = [
  { label: "All Courses", href: "/courses" },
  { label: "Learning Paths", href: "/paths" },
  { label: "Free Courses", href: "/courses?price=free" },
  { label: "Certificates", href: "/certificates" },
  { label: "Leaderboard", href: "/leaderboard" },
];

const socialIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  twitterUrl: Twitter,
  linkedInUrl: Linkedin,
  youtubeUrl: Youtube,
  instagramUrl: Instagram,
  facebookUrl: Facebook,
  tiktokUrl: Music2,
};

export function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<SiteSettings>({});

  useEffect(() => {
    const keys =
      "supportEmail,supportPhone,whatsappNumber,physicalAddress,facebookUrl,twitterUrl,instagramUrl,linkedInUrl,youtubeUrl,tiktokUrl";
    fetch(`/api/settings?keys=${keys}`)
      .then((response) => response.json())
      .then((payload) => setSettings(payload ?? {}))
      .catch(() => {});
  }, []);

  async function handleNewsletter(event: React.FormEvent) {
    event.preventDefault();
    if (!email || status === "saving") return;
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to subscribe right now.");
      setStatus("success");
      setMessage(data.message || "Subscription confirmed. Check your inbox for the next issue.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to subscribe right now.");
    }
  }

  const activeSocials = Object.entries(socialIconMap)
    .map(([key, Icon]) => ({ key, Icon, url: settings[key as keyof SiteSettings] as string | undefined }))
    .filter((entry) => entry.url);

  const whatsappUrl = settings.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`
    : null;

  function handleInternalNavigation() {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  return (
    <footer className="mt-20 border-t border-neutral-200 bg-white text-gray-900 dark:border-neutral-900 dark:bg-black dark:text-white">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-900 dark:bg-black">
        <div className="section-frame py-12 sm:py-14">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-blue/20 bg-primary-blue/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                <Sparkles className="h-3.5 w-3.5" />
                Newsletter
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Stay current with AI without the noise</h3>
              <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-neutral-300">
                Get weekly updates on new courses, practical guides, and AI trends that matter for real work.
              </p>
            </div>
            {status === "success" ? (
              <div className="w-full rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-sm font-medium text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-black dark:text-emerald-300 lg:max-w-md">
                {message}
              </div>
            ) : (
              <div className="w-full max-w-md">
                <form onSubmit={handleNewsletter} className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (status === "error") {
                        setStatus("idle");
                        setMessage("");
                      }
                    }}
                    placeholder="your@email.com"
                    required
                    className="input-surface flex-1 border-neutral-300 text-gray-900 placeholder:text-gray-500 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-500"
                  />
                  <button type="submit" className="action-primary shrink-0" disabled={status === "saving"}>
                    {status === "saving" ? "Joining..." : "Subscribe"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
                {status === "error" && message ? (
                  <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{message}</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section-frame py-12 sm:py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-10">
            <div className="sm:col-span-2 lg:col-span-2">
            <Link href="/" scroll onClick={handleInternalNavigation} className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-blue">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                AI Learning <span className="text-primary-blue">Class</span>
              </span>
            </Link>
            <p className="mb-6 max-w-md text-sm leading-6 text-gray-700 dark:text-neutral-300">
              Professional AI education designed for learners who want structure, depth, and real-world outcomes.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-gray-900 dark:text-white">Learn</h4>
            <ul className="space-y-3">
              {learnLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    scroll
                    onClick={handleInternalNavigation}
                    className="text-sm text-gray-900 transition-colors hover:text-primary-blue dark:text-neutral-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-gray-900 dark:text-white">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    scroll
                    onClick={handleInternalNavigation}
                    className="text-sm text-gray-900 transition-colors hover:text-primary-blue dark:text-neutral-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-gray-900 dark:text-white">Support</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href={`mailto:${settings.supportEmail || "support@ailearningclass.com"}`}
                  className="flex items-start gap-2.5 text-sm text-gray-900 transition-colors hover:text-primary-blue dark:text-neutral-200"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-blue" />
                  {settings.supportEmail || "support@ailearningclass.com"}
                </a>
              </li>
              {settings.supportPhone ? (
                <li>
                  <a
                    href={`tel:${settings.supportPhone}`}
                    className="flex items-center gap-2.5 text-sm text-gray-900 transition-colors hover:text-primary-blue dark:text-neutral-200"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-primary-blue" />
                    {settings.supportPhone}
                  </a>
                </li>
              ) : null}
              {whatsappUrl ? (
                <li>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm text-gray-900 transition-colors hover:text-primary-blue dark:text-neutral-200"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-primary-blue" />
                    WhatsApp Chat
                  </a>
                </li>
              ) : null}
              <li>
                <div className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-neutral-300">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-blue" />
                  <span>{settings.physicalAddress || "Nairobi, Kenya"}</span>
                </div>
              </li>
              <li>
                <div className="flex flex-wrap gap-2 pt-2">
                  {activeSocials.length > 0 ? (
                    activeSocials.map(({ key, Icon, url }) => (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-gray-900 transition-colors hover:border-primary-blue/30 hover:bg-primary-blue/10 hover:text-primary-blue dark:border-neutral-800 dark:bg-black dark:text-white"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-neutral-300">Social links coming soon.</p>
                  )}
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-900">
        <div className="section-frame flex flex-col items-start justify-between gap-4 py-6 text-left sm:flex-row sm:items-center">
          <p className="text-xs text-gray-700 dark:text-neutral-400">
            Copyright {new Date().getFullYear()} AI Learning Class. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-700 dark:text-neutral-400">Payments secured by</span>
            {["Stripe", "PayPal", "Paystack"].map((provider) => (
              <span
                key={provider}
                className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-gray-900 dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
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
