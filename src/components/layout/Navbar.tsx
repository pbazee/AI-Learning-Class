"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Heart,
  LogOut,
  Menu,
  MoonStar,
  Search,
  Shield,
  ShoppingCart,
  SunMedium,
  UserRound,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { CourseSearchSuggestion } from "@/types";
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
  { label: "Featured Courses", href: "/courses?filter=featured" },
  { label: "Trending Courses", href: "/courses?filter=trending" },
  { label: "Popular Courses", href: "/courses?filter=popular" },
  { label: "New Releases", href: "/courses?filter=new-releases" },
  { label: "Recommended", href: "/courses?filter=recommended" },
  { label: "Learning Paths", href: "/paths" },
  { label: "Categories", href: "/categories" },
  { label: "Affiliate Program", href: "/affiliate" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact Us", href: "/contact" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Cart", href: "/cart" },
];

const featuredSearches = ["Explore LLM Courses", "Prompt engineering", "Beginner AI", "Agent workflows"];

function getDisplayName(user: User | null) {
  if (!user) return "";
  return String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Member").trim();
}

function formatLevel(level: CourseSearchSuggestion["level"]) {
  return level.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function mobileCtaText(label: string) {
  return /explore/i.test(label) && /course/i.test(label) ? "Explore Courses" : label.length > 18 ? "Explore Courses" : label;
}

function SearchPanel({
  query,
  loading,
  results,
  onSubmit,
  onClose,
}: {
  query: string;
  loading: boolean;
  results: CourseSearchSuggestion[];
  onSubmit: (query: string) => void;
  onClose: () => void;
}) {
  const hasQuery = Boolean(query.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.14 }}
      className="absolute inset-x-0 top-full z-30 mt-3 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="p-4">
        {hasQuery ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Matching courses</p>
              <button type="button" onClick={() => onSubmit(query)} className="text-xs font-semibold text-primary-blue hover:underline">
                View all
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 px-3 py-3 dark:border-slate-800">
                    <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length ? (
              <div className="space-y-2">
                {results.map((result) => (
                  <Link key={result.id} href={`/courses/${result.slug}`} onClick={onClose} className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-primary-blue/5">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                      {result.thumbnailUrl ? (
                        <Image src={result.thumbnailUrl} alt={result.title} fill className="object-cover" sizes="48px" />
                      ) : (
                        <GraduationCap className="h-5 w-5 text-primary-blue" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{result.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary-blue/10 px-2.5 py-1 text-[11px] font-semibold text-primary-blue">{formatLevel(result.level)}</span>
                        {result.categoryName ? <span className="text-xs text-slate-500 dark:text-slate-400">{result.categoryName}</span> : null}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                No matching courses yet. Try a broader keyword.
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {featuredSearches.map((term) => (
                <button key={term} type="button" onClick={() => onSubmit(term)} className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary-blue/25 hover:bg-primary-blue/5 hover:text-primary-blue dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  {mobileCtaText(term)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CourseSearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
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
      if (!nextUser) return void setUserRole(null);
      try {
        const response = await fetch("/api/auth/sync-user", { method: "POST" });
        const payload = await response.json();
        if (!response.ok) throw new Error("Unable to sync");
        setUserRole(payload.user?.role ?? null);
      } catch {
        setUserRole(typeof nextUser.user_metadata?.role === "string" ? nextUser.user_metadata.role : typeof nextUser.app_metadata?.role === "string" ? nextUser.app_metadata.role : null);
      }
    };
    supabase.auth.getUser().then(({ data }) => void syncRole(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => void syncRole(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const updateNavbarHeight = () => document.documentElement.style.setProperty("--navbar-height", `${navRef.current?.offsetHeight ?? 0}px`);
    updateNavbarHeight();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateNavbarHeight) : null;
    if (navRef.current && observer) observer.observe(navRef.current);
    return () => {
      observer?.disconnect();
      document.documentElement.style.setProperty("--navbar-height", "0px");
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
      const desktopInside = desktopSearchRef.current?.contains(event.target as Node) ?? false;
      const mobileInside = mobileSearchRef.current?.contains(event.target as Node) ?? false;
      if (!desktopInside && !mobileInside) setSearchFocused(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const query = deferredSearchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return void setSearchLoading(false);
    }
    const controller = new AbortController();
    setSearchLoading(true);
    fetch(`/api/search/courses?q=${encodeURIComponent(query)}&limit=6`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => { if (!controller.signal.aborted) setSearchResults(Array.isArray(payload?.results) ? payload.results : []); })
      .catch((error) => { if (!(error instanceof DOMException && error.name === "AbortError")) console.error("[nav-search]", error); })
      .finally(() => { if (!controller.signal.aborted) setSearchLoading(false); });
    return () => controller.abort();
  }, [deferredSearchQuery]);

  useEffect(() => {
    setProfileOpen(false);
    setMenuOpen(false);
    setSearchFocused(false);
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserRole(null);
    router.push("/");
    router.refresh();
  }

  function submitSearch(query = searchQuery) {
    const nextQuery = query.trim();
    setSearchFocused(false);
    if (!nextQuery) return router.push("/courses");
    router.push(`/courses?q=${encodeURIComponent(nextQuery)}`);
  }

  const displayName = getDisplayName(user);
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const showSearchSuggestions = searchFocused;
  const profileLinks = [
    { label: "My Dashboard", href: "/dashboard", icon: GraduationCap },
    { label: "Wishlist", href: "/wishlist", icon: Heart },
    ...(isAdmin ? [{ label: "Admin Console", href: "/admin", icon: Shield }] : []),
  ];

  return (
    <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <nav ref={navRef} className="sticky top-[var(--announcement-height)] z-[90] border-b border-slate-200/80 bg-white/95 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.3)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="hidden min-h-[76px] items-center gap-4 lg:flex">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-blue text-white shadow-[0_18px_45px_-24px_rgba(0,86,210,0.9)]"><Brain className="h-[19px] w-[19px]" /></div>
              <span className="text-[15px] font-black uppercase tracking-[0.18em] text-slate-950 dark:text-white">AI LEARNING CLASS</span>
            </Link>
            <div ref={desktopSearchRef} className="relative w-full max-w-[500px] flex-1">
              <form onSubmit={(event) => { event.preventDefault(); submitSearch(); }} className="group flex h-12 items-center gap-3 rounded-full border border-slate-300 bg-white px-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)] transition focus-within:border-primary-blue/35 dark:border-slate-800 dark:bg-slate-900">
                <Search className="h-[17px] w-[17px] shrink-0 text-slate-400 group-focus-within:text-primary-blue dark:text-slate-500" />
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onFocus={() => setSearchFocused(true)} placeholder="Search AI courses, LLM tracks, prompts..." className="h-full flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500" />
              </form>
              <AnimatePresence>{showSearchSuggestions ? <SearchPanel query={searchQuery} loading={searchLoading} results={searchResults} onSubmit={submitSearch} onClose={() => setSearchFocused(false)} /> : null}</AnimatePresence>
            </div>
            <div className="flex items-center gap-1">
              {desktopLinks.map((link) => {
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return <Link key={link.href} href={link.href} className={cn("rounded-full px-3.5 py-2 text-sm font-semibold transition", active ? "bg-primary-blue/10 text-primary-blue" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900")}>{link.label}</Link>;
              })}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/wishlist" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-primary-blue/25 hover:bg-primary-blue/5 hover:text-primary-blue dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"><Heart className="h-[18px] w-[18px]" /></Link>
              {mounted ? <button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-primary-blue/25 hover:bg-primary-blue/5 hover:text-primary-blue dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900">{resolvedTheme === "dark" ? <SunMedium className="h-[18px] w-[18px]" /> : <MoonStar className="h-[18px] w-[18px]" />}</button> : null}
              <Link href="/cart" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-primary-blue/25 hover:bg-primary-blue/5 hover:text-primary-blue dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900">
                <ShoppingCart className="h-[18px] w-[18px]" />
                {cartCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-blue px-1 text-[10px] font-bold text-white">{cartCount}</span> : null}
              </Link>
              {user ? (
                <div ref={profileRef} className="relative">
                  <button type="button" onClick={() => setProfileOpen((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[0_10px_26px_-24px_rgba(15,23,42,0.35)] transition hover:border-primary-blue/25 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                    <span className="max-w-[88px] truncate">{displayName.split(" ")[0] || "Member"}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-slate-500 transition-transform dark:text-slate-400", profileOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence>{profileOpen ? (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.14 }} className="absolute right-0 top-full z-20 mt-3 w-72 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_28px_80px_-38px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-950">
                      <div className="border-b border-slate-100 bg-gradient-to-br from-primary-blue/10 via-white to-primary-blue/5 px-5 py-4 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Signed in</p>
                        <p className="mt-2 text-base font-bold text-slate-950 dark:text-white">{displayName}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                      </div>
                      <div className="p-3">
                        {profileLinks.map(({ href, icon: Icon, label }) => (
                          <Link key={href} href={href} onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">
                            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue dark:bg-slate-900"><Icon className="h-[18px] w-[18px]" /></span>
                            {label}
                          </Link>
                        ))}
                        <button type="button" onClick={handleSignOut} className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/20">
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/30"><LogOut className="h-[18px] w-[18px]" /></span>
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  ) : null}</AnimatePresence>
                </div>
              ) : (
                <Link href="/login" className="inline-flex h-10 items-center rounded-full bg-primary-blue px-4 text-sm font-bold text-white shadow-[0_18px_40px_-24px_rgba(0,86,210,0.95)] transition hover:bg-primary-blue/90">Login</Link>
              )}
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-primary-blue/25 hover:bg-primary-blue/5 hover:text-primary-blue dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                  aria-label="Open full site menu"
                >
                  <Menu className="h-[18px] w-[18px]" />
                </button>
              </Dialog.Trigger>
            </div>
          </div>

          <div className="py-3 lg:hidden">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex shrink-0 items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-blue text-white"><Brain className="h-[17px] w-[17px]" /></div>
                <span className="hidden text-[11px] font-black uppercase tracking-[0.16em] text-slate-950 dark:text-white sm:inline">AI CLASS</span>
              </Link>
              <div ref={mobileSearchRef} className="relative min-w-0 flex-1">
                <form onSubmit={(event) => { event.preventDefault(); submitSearch(); }} className="group flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.35)] transition focus-within:border-primary-blue/35 dark:border-slate-800 dark:bg-slate-900">
                  <Search className="h-[15px] w-[15px] shrink-0 text-slate-400 group-focus-within:text-primary-blue dark:text-slate-500" />
                  <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onFocus={() => setSearchFocused(true)} placeholder="Search" className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500" />
                </form>
                <AnimatePresence>{showSearchSuggestions ? <SearchPanel query={searchQuery} loading={searchLoading} results={searchResults} onSubmit={submitSearch} onClose={() => setSearchFocused(false)} /> : null}</AnimatePresence>
              </div>
              {mounted ? <button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200">{resolvedTheme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}</button> : null}
              <Dialog.Trigger asChild>
                <button type="button" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200" aria-label="Open menu">
                  <Menu className="h-4 w-4" />
                </button>
              </Dialog.Trigger>
            </div>
          </div>
        </div>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[118] bg-slate-950/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-[119] w-[88vw] max-w-sm border-r border-slate-200 bg-white shadow-[0_40px_120px_-48px_rgba(15,23,42,0.4)] focus:outline-none dark:border-slate-800 dark:bg-slate-950">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                  <Dialog.Title className="text-sm font-black uppercase tracking-[0.18em] text-slate-950 dark:text-white">AI Learning Class</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-slate-500 dark:text-slate-400">Explore every key page from one clean menu.</Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900" aria-label="Close menu">
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-2">
                  {drawerLinks.map((link) => {
                    const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                    return <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={cn("flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition", active ? "bg-primary-blue/10 text-primary-blue" : "bg-slate-50 text-slate-800 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800")}>{link.label}<span className="text-slate-400 dark:text-slate-500">/</span></Link>;
                  })}
                </div>
                <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  {user ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Signed in as</p>
                      <p className="mt-2 text-base font-bold text-slate-950 dark:text-white">{displayName}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                      <div className="mt-4 space-y-2">
                        {profileLinks.map(({ href, label, icon: Icon }) => (
                          <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800">
                            <Icon className="h-4 w-4 text-primary-blue" />
                            {label}
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">Account</p>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to manage your dashboard, wishlist, and course progress.</p>
                      <Link href="/login" onClick={() => setMenuOpen(false)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-blue px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-blue/90">
                        <UserRound className="h-4 w-4" />
                        Login
                      </Link>
                    </>
                  )}
                </div>
              </div>
              {user ? (
                <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                  <button type="button" onClick={handleSignOut} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </nav>
    </Dialog.Root>
  );
}
