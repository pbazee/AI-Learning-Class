"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  BookOpen,
  Brain,
  ChevronDown,
  GraduationCap,
  Heart,
  LogOut,
  Menu,
  MoonStar,
  Search,
  Shield,
  ShoppingCart,
  SunMedium,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

const desktopLinks = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Pricing", href: "/pricing" },
  { label: "Affiliate", href: "/affiliate" },
];

const drawerLinks = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Learning Paths", href: "/paths" },
  { label: "Categories", href: "/categories" },
  { label: "Popular Courses", href: "/courses?filter=popular" },
  { label: "Trending", href: "/courses?filter=trending" },
  { label: "New Releases", href: "/courses?filter=new-releases" },
  { label: "Featured", href: "/courses?filter=featured" },
  { label: "Contact Us", href: "/contact" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Affiliate", href: "/affiliate" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Cart", href: "/cart" },
];

const suggestionGroups = [
  {
    label: "Courses",
    href: "/courses",
    icon: GraduationCap,
    description: "Explore flagship AI tracks, certificates, and cohort-ready programs.",
    keywords: ["courses", "class", "career", "certificates", "lessons", "training"],
  },
  {
    label: "Free Resources",
    href: "/blog",
    icon: BookOpen,
    description: "Discover free resources, learning guides, and weekly AI insights.",
    keywords: ["free", "resources", "guides", "blog", "journal", "newsletter"],
  },
  {
    label: "AI Tools",
    href: "/blog?tag=AI%20Tools",
    icon: Brain,
    description: "Find practical AI tools, workflows, and implementation ideas.",
    keywords: ["tools", "agents", "automation", "prompts", "workflow", "stack"],
  },
];

const featuredSearches = ["Prompt engineering", "Beginner AI", "Free resources", "LLM tools"];

function getDisplayName(user: User | null) {
  if (!user) {
    return "";
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Member";

  return String(fullName).trim();
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const cartCount = useCartStore((state) => state.itemCount)();
  const { resolvedTheme, setTheme } = useTheme();
  const navRef = useRef<HTMLElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    const syncRole = async (nextUser: User | null) => {
      setUser(nextUser);

      if (!nextUser) {
        setUserRole(null);
        return;
      }

      try {
        const response = await fetch("/api/auth/sync-user", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Unable to sync the current user role.");
        }

        const payload = await response.json();
        setUserRole(payload.user?.role ?? null);
      } catch {
        const fallbackRole =
          typeof nextUser.user_metadata?.role === "string"
            ? nextUser.user_metadata.role
            : typeof nextUser.app_metadata?.role === "string"
              ? nextUser.app_metadata.role
              : null;

        setUserRole(fallbackRole);
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      void syncRole(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      void syncRole(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const updateNavbarHeight = () => {
      const nextHeight = navRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty("--navbar-height", `${nextHeight}px`);
    };

    updateNavbarHeight();
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateNavbarHeight())
        : null;

    if (navRef.current && resizeObserver) {
      resizeObserver.observe(navRef.current);
    }

    return () => {
      resizeObserver?.disconnect();
      document.documentElement.style.setProperty("--navbar-height", "0px");
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }

      const clickedInsideDesktop = desktopSearchRef.current?.contains(event.target as Node) ?? false;
      const clickedInsideMobile = mobileSearchRef.current?.contains(event.target as Node) ?? false;

      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserRole(null);
    setProfileOpen(false);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  function submitSearch(query = searchQuery) {
    const nextQuery = query.trim();
    setSearchFocused(false);
    setMenuOpen(false);

    if (!nextQuery) {
      router.push("/courses");
      return;
    }

    router.push(`/courses?q=${encodeURIComponent(nextQuery)}`);
  }

  const displayName = getDisplayName(user);
  const firstName = displayName.split(" ")[0] || "Member";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return suggestionGroups;
    }

    return suggestionGroups.filter((suggestion) => {
      const searchable = `${suggestion.label} ${suggestion.description} ${suggestion.keywords.join(" ")}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [deferredSearchQuery]);

  const profileLinks = [
    { label: "My Dashboard", href: "/dashboard", icon: GraduationCap },
    { label: "Wishlist", href: "/wishlist", icon: Heart },
    ...(isAdmin ? [{ label: "Admin Console", href: "/admin", icon: Shield }] : []),
  ];

  const showSearchSuggestions = searchFocused && (filteredSuggestions.length > 0 || !deferredSearchQuery.trim());

  return (
    <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <nav
        ref={navRef}
        className="sticky top-[var(--announcement-height)] z-[90] border-b border-slate-200/80 bg-white/95 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.3)] backdrop-blur-xl dark:border-slate-800 dark:bg-gray-950/95"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="hidden min-h-[76px] items-center gap-4 lg:flex">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 text-white shadow-[0_16px_36px_-18px_rgba(37,99,235,0.8)]">
                <Brain className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[15px] font-black uppercase tracking-[0.18em] text-slate-950 dark:text-white">
                AI LEARNING CLASS
              </span>
            </Link>

            <div ref={desktopSearchRef} className="relative w-full max-w-[440px] flex-1 xl:max-w-[500px]">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitSearch();
                }}
                className="group flex h-12 items-center gap-3 rounded-full border border-slate-300 bg-white px-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)] transition-all focus-within:border-blue-300 focus-within:shadow-[0_20px_48px_-30px_rgba(37,99,235,0.35)] dark:border-slate-800 dark:bg-slate-900"
              >
                <Search className="h-[17px] w-[17px] shrink-0 text-slate-400 transition-colors group-focus-within:text-blue-500 dark:text-slate-500 dark:group-focus-within:text-primary-blue" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search courses, blogs, AI tools..."
                  className="h-full flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                />
              </form>

              <AnimatePresence>
                {showSearchSuggestions ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.14 }}
                    className="absolute inset-x-0 top-full mt-3 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_28px_80px_-40px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="p-4">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Quick jump
                      </p>
                      <div className="space-y-2">
                        {(filteredSuggestions.length > 0 ? filteredSuggestions : suggestionGroups).map(
                          ({ href, icon: Icon, label, description }) => (
                            <button
                              key={href}
                              type="button"
                              onClick={() => {
                                setSearchFocused(false);
                                setSearchQuery("");
                                router.push(href);
                              }}
                              className="flex w-full items-start gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-all hover:border-orange-200 hover:bg-orange-50/60 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                            >
                              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-blue-600 dark:bg-slate-900 dark:text-primary-blue">
                                <Icon className="h-[18px] w-[18px]" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
                              </div>
                            </button>
                          )
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {featuredSearches.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => {
                              setSearchQuery(term);
                              submitSearch(term);
                            }}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-all hover:border-blue-200 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-primary-blue dark:hover:text-primary-blue"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1">
              {desktopLinks.map((link) => {
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-full px-3.5 py-2 text-sm font-semibold transition-all",
                      active
                        ? "bg-blue-50 text-blue-700 dark:bg-primary-blue/15 dark:text-primary-blue"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/wishlist"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-slate-800 dark:text-slate-200 dark:hover:border-primary-blue dark:hover:bg-slate-900 dark:hover:text-primary-blue"
                aria-label="Wishlist"
              >
                <Heart className="h-[18px] w-[18px]" />
              </Link>

              {mounted ? (
                <button
                  type="button"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:text-slate-200 dark:hover:border-primary-blue dark:hover:bg-slate-900 dark:hover:text-primary-blue"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "dark" ? <SunMedium className="h-[18px] w-[18px]" /> : <MoonStar className="h-[18px] w-[18px]" />}
                </button>
              ) : null}

              <Link
                href="/cart"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:text-slate-200 dark:hover:border-primary-blue dark:hover:bg-slate-900 dark:hover:text-primary-blue"
                aria-label="Shopping cart"
              >
                <ShoppingCart className="h-[18px] w-[18px]" />
                {cartCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                ) : null}
              </Link>

              {user ? (
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => setProfileOpen((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[0_10px_26px_-24px_rgba(15,23,42,0.35)] transition-all hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-primary-blue"
                  >
                    <span className="max-w-[88px] truncate">{firstName}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-slate-500 transition-transform dark:text-slate-400", profileOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {profileOpen ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.14 }}
                        className="absolute right-0 top-full z-20 mt-3 w-72 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_28px_80px_-38px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50 via-white to-orange-50 px-5 py-4 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Signed in
                          </p>
                          <p className="mt-2 text-base font-bold text-slate-950 dark:text-white">{displayName}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>

                        <div className="p-3">
                          {profileLinks.map(({ href, icon: Icon, label }) => (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white"
                            >
                              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-blue-600 dark:bg-slate-900 dark:text-primary-blue">
                                <Icon className="h-[18px] w-[18px]" />
                              </span>
                              {label}
                            </Link>
                          ))}

                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-rose-600 transition-all hover:bg-rose-50"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                              <LogOut className="h-[18px] w-[18px]" />
                            </span>
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-10 items-center rounded-full bg-orange-500 px-4 text-sm font-bold text-white shadow-[0_18px_40px_-24px_rgba(249,115,22,0.95)] transition-all hover:bg-orange-400"
                >
                  Login
                </Link>
              )}

              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  aria-label="Open menu"
                >
                  <Menu className="h-[18px] w-[18px]" />
                </button>
              </Dialog.Trigger>
            </div>
          </div>

          <div className="space-y-3 py-3 lg:hidden">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 text-white">
                  <Brain className="h-[17px] w-[17px]" />
                </div>
                <span className="truncate text-[11px] font-black uppercase tracking-[0.16em] text-slate-950 dark:text-white sm:text-[13px]">
                  AI LEARNING CLASS
                </span>
              </Link>

              <Link href="/wishlist" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200" aria-label="Wishlist">
                <Heart className="h-4 w-4" />
              </Link>
              {mounted ? (
                <button
                  type="button"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                </button>
              ) : null}
              <Link href="/cart" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200" aria-label="Cart">
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
                    {cartCount}
                  </span>
                ) : null}
              </Link>

              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <span className="max-w-[48px] truncate">{firstName}</span>
                </Link>
              ) : (
                <Link href="/login" className="inline-flex h-9 items-center rounded-full bg-orange-500 px-3 text-xs font-bold text-white">
                  Login
                </Link>
              )}

              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </Dialog.Trigger>
            </div>

            <div ref={mobileSearchRef} className="relative">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitSearch();
                }}
                className="group flex h-11 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900"
              >
                <Search className="h-[17px] w-[17px] shrink-0 text-slate-400 group-focus-within:text-blue-500 dark:text-slate-500 dark:group-focus-within:text-primary-blue" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search courses, blogs, AI tools..."
                  className="h-full flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                />
              </form>

              <AnimatePresence>
                {showSearchSuggestions ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.14 }}
                    className="absolute inset-x-0 top-full mt-3 z-20 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_22px_64px_-34px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="p-4">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Popular searches
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {featuredSearches.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => {
                              setSearchQuery(term);
                              submitSearch(term);
                            }}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[118] bg-slate-950/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-y-0 right-0 z-[119] w-[88vw] max-w-sm border-l border-slate-200 bg-white shadow-[0_40px_120px_-48px_rgba(15,23,42,0.4)] focus:outline-none dark:border-slate-800 dark:bg-gray-950">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                  <Dialog.Title className="text-sm font-black uppercase tracking-[0.18em] text-slate-950 dark:text-white">
                    AI Learning Class
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Explore every key page from one clean menu.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-2">
                  {drawerLinks.map((link) => {
                    const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all",
                          active
                            ? "bg-blue-50 text-blue-700 dark:bg-primary-blue/15 dark:text-primary-blue"
                            : "bg-slate-50 text-slate-800 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        {link.label}
                        <span className="text-slate-400 dark:text-slate-500">/</span>
                      </Link>
                    );
                  })}
                </div>

                {user ? (
                  <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Signed in as
                    </p>
                    <p className="mt-2 text-base font-bold text-slate-950 dark:text-white">{displayName}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</p>

                    <div className="mt-4 space-y-2">
                      {profileLinks.map(({ href, label }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMenuOpen(false)}
                          className="flex rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                {user ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-orange-400"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </nav>
    </Dialog.Root>
  );
}
