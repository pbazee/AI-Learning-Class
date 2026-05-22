// src/app/not-found.tsx
import Link from "next/link";
import { Brain, Home, BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      <div className="absolute inset-0 cyber-grid-bg opacity-20" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl" />

      <div className="relative z-10 text-center max-w-md">
        {/* Glitchy 404 */}
        <div className="relative mb-8">
          <div className="select-none text-[120px] font-black leading-none text-muted-foreground/20">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card">
              <Brain className="w-10 h-10 text-neon-blue" />
            </div>
          </div>
        </div>

        <h1 className="mb-3 text-2xl font-black text-foreground">
          Page Not Found
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          The page you requested could not be found.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold hover:opacity-90 transition-all">
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <Link href="/courses" className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-muted-foreground transition-all hover:text-foreground">
            <BookOpen className="w-4 h-4" /> Browse Courses
          </Link>
        </div>
      </div>
    </div>
  );
}
