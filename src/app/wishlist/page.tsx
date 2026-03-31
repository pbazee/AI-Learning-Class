import Link from "next/link";
import { Heart, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function WishlistPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto flex max-w-4xl flex-col items-center px-4 py-16 text-center sm:px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-[0_20px_40px_-24px_rgba(249,115,22,0.9)]">
          <Heart className="h-7 w-7" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
          Save For Later
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">
          Your wishlist is ready for the next cohort.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          Start bookmarking the AI courses, tools, and resources you want to revisit. We&apos;ve
          set up the destination so the upgraded storefront navigation has a polished place to land.
        </p>

        <div className="mt-10 grid w-full gap-4 rounded-[32px] border border-border bg-card p-6 text-left shadow-sm sm:grid-cols-3">
          {[
            "Save standout courses before checkout",
            "Keep your favorite AI tools and free resources together",
            "Return faster from the premium storefront header",
          ].map((item) => (
            <div key={item} className="rounded-[24px] border border-border bg-muted/30 p-4">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <p className="mt-3 text-sm font-semibold text-foreground">{item}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/courses"
            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Explore Courses
          </Link>
          <Link
            href="/blog"
            className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Browse Free Resources
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
