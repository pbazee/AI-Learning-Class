"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BadgeCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  CreditCard,
  FolderTree,
  FileText,
  House,
  Image,
  Inbox,
  Layers3,
  LayoutDashboard,
  Link2,
  Mail,
  Megaphone,
  Newspaper,
  ShoppingBag,
  Share2,
  Settings,
  Sparkles,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { AdminSessionControls } from "@/components/admin/admin-session-controls";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { DEFAULT_SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Learners", href: "/admin/learners", icon: GraduationCap },
  { label: "User Subscriptions", href: "/admin/user-subscriptions", icon: CreditCard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Blogs", href: "/admin/blogs", icon: Newspaper },
  { label: "Coupons", href: "/admin/coupons", icon: Ticket },
  { label: "Subscribers", href: "/admin/subscribers", icon: Mail },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Popups", href: "/admin/popups", icon: Layers3 },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { label: "Hero Slides", href: "/admin/hero-slides", icon: Image },
  { label: "Trusted Logos", href: "/admin/trusted-logos", icon: BadgeCheck },
  { label: "Messages", href: "/admin/messages", icon: Inbox },
  { label: "Paragraphs", href: "/admin/paragraphs", icon: FileText },
  { label: "Affiliates", href: "/admin/affiliates", icon: Link2 },
  { label: "Referrals", href: "/admin/referrals", icon: Share2 },
  { label: "Ask AI", href: "/admin/ask-ai", icon: Sparkles },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/admin": {
    title: "Dashboard",
    subtitle: "Premium command center for revenue, learners, and growth.",
  },
  "/admin/courses": {
    title: "Courses",
    subtitle: "Curate catalog health, pricing, curriculum, and launch velocity.",
  },
  "/admin/categories": {
    title: "Categories",
    subtitle: "Control the taxonomy visible across the storefront and blog.",
  },
  "/admin/users": {
    title: "Users",
    subtitle: "Review learner history, certificates, and access levels in one place.",
  },
  "/admin/learners": {
    title: "Learners",
    subtitle: "View student profiles, enrollment progress, and learning activity.",
  },
  "/admin/user-subscriptions": {
    title: "User Subscriptions",
    subtitle: "Track active paid access, renewals, and plan revenue by learner.",
  },
  "/admin/subscriptions": {
    title: "Subscriptions",
    subtitle: "Shape the plan architecture powering recurring revenue.",
  },
  "/admin/ask-ai": {
    title: "Ask AI",
    subtitle: "Manage the assistant experience, availability, and plan-based monthly usage limits.",
  },
  "/admin/orders": {
    title: "Orders",
    subtitle: "Track customer payments, fulfillment, refunds, and access delivery.",
  },
  "/admin/popups": {
    title: "Popups",
    subtitle: "Design promotional moments with precise targeting and timing.",
  },
  "/admin/hero-slides": {
    title: "Hero Slides",
    subtitle: "Control the first impression of the homepage experience.",
  },
  "/admin/trusted-logos": {
    title: "Trusted Logos",
    subtitle: "Manage the marquee of brands and partners shown beneath the homepage hero.",
  },
  "/admin/messages": {
    title: "Messages",
    subtitle: "Reply to incoming contact messages and keep the support inbox organized.",
  },
  "/admin/paragraphs": {
    title: "Homepage Sections",
    subtitle: "Edit the supporting copy that appears across the homepage in real time.",
  },
};

function resolvePageMeta(pathname: string) {
  const exact = pageTitles[pathname];
  if (exact) {
    return exact;
  }

  const matchingKey = Object.keys(pageTitles)
    .filter((key) => key !== "/admin" && pathname.startsWith(key))
    .sort((left, right) => right.length - left.length)[0];

  if (matchingKey) {
    return pageTitles[matchingKey];
  }

  const segment = pathname.split("/").filter(Boolean).pop() ?? "dashboard";
  const title = segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    title,
    subtitle: "Manage the premium learning platform with confidence.",
  };
}

export function AdminClientLayout({
  children,
  branding,
}: {
  children: React.ReactNode;
  branding: { siteName: string; logoUrl?: string };
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const pageMeta = useMemo(() => resolvePageMeta(pathname), [pathname]);

  return (
    <div className="dark min-h-screen bg-[#04070d] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.24),transparent_55%)]" />
        <div className="absolute left-[-10%] top-[18%] h-80 w-80 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute right-[-8%] top-[42%] h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-white/10 bg-[#050811]/90 backdrop-blur-2xl transition-all duration-300",
          collapsed ? "w-24" : "w-80"
        )}
      >
        <div className={cn("border-b border-white/10 p-5", collapsed && "px-4")}>
          <Link href="/admin" className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <SiteLogo
              siteName={branding.siteName || DEFAULT_SITE_NAME}
              logoUrl={branding.logoUrl || undefined}
              compact={collapsed}
              textClassName="text-sm uppercase tracking-[0.12em] text-white"
            />
            {!collapsed ? (
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-blue-300">
                  Admin Console
                </div>
              </div>
            ) : null}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all",
                  active
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_22px_45px_-25px_rgba(59,130,246,0.95)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                  collapsed && "justify-center"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed ? label : null}
              </Link>
            );
          })}
        </nav>

        <div className={cn("border-t border-white/10 p-4", collapsed && "px-4")}>
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white",
              collapsed && "justify-center"
            )}
          >
            <House className="h-4 w-4" />
            {!collapsed ? "Back to site" : null}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="absolute -right-3 top-24 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#0b1220] text-slate-300 shadow-lg"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      <main className={cn("relative z-10 min-h-screen transition-all duration-300", collapsed ? "ml-24" : "ml-80")}>
        <div className="sticky top-0 z-30 border-b border-white/10 bg-[#04070d]/80 px-6 py-4 backdrop-blur-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                Premium Operations
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">{pageMeta.title}</h1>
              <p className="mt-1 text-sm text-slate-400">{pageMeta.subtitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <AdminSessionControls />
            </div>
          </div>
        </div>

        <div className="admin-content p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
