"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Heart, House, ShoppingCart, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

const navItems = [
  { label: "Home", href: "/", icon: House },
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Cart", href: "/cart", icon: ShoppingCart },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
];

function shouldHideMobileNav(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/checkout") ||
    pathname === "/login" ||
    pathname === "/signin" ||
    pathname === "/signup" ||
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/forgot-password"
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((state) => state.itemCount)();
  const [accountHref, setAccountHref] = useState("/login");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setAccountHref(data.user ? "/dashboard" : "/login");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setAccountHref(session?.user ? "/dashboard" : "/login");
    });

    return () => subscription.unsubscribe();
  }, []);

  if (shouldHideMobileNav(pathname)) {
    return null;
  }

  const items = [
    ...navItems,
    { label: "Account", href: accountHref, icon: UserRound },
  ];

  return (
    <>
      <div className="h-[var(--mobile-bottom-nav-height)] lg:hidden" />
      <nav className="fixed inset-x-0 bottom-0 z-[95] border-t border-slate-200/80 bg-white/96 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-18px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/96 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {items.map(({ label, href, icon: Icon }) => {
            const active =
              (href === "/" && pathname === "/") ||
              (href !== "/" && pathname.startsWith(href)) ||
              (label === "Account" && pathname.startsWith("/dashboard"));

            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition",
                  active
                    ? "bg-primary-blue/12 text-primary-blue"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                )}
              >
                <div className="relative">
                  <Icon className="h-[18px] w-[18px]" />
                  {label === "Cart" && cartCount > 0 ? (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-blue px-1 text-[9px] font-bold text-white">
                      {cartCount}
                    </span>
                  ) : null}
                </div>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
