// src/app/not-found.tsx
import Link from "next/link";
import { Brain, Home, BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 cyber-grid-bg opacity-20" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl" />

      <div className="relative z-10 text-center max-w-md">
        {/* Glitchy 404 */}
        <div className="relative mb-8">
          <div className="text-[120px] font-black leading-none text-white/5 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 flex items-center justify-center">
              <Brain className="w-10 h-10 text-neon-blue" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-black text-white mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          The page you requested could not be found.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold hover:opacity-90 transition-all">
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <Link href="/courses" className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl glass-card border border-white/10 text-gray-300 hover:text-white transition-all">
            <BookOpen className="w-4 h-4" /> Browse Courses
          </Link>
        </div>
      </div>
    </div>
  );
}
