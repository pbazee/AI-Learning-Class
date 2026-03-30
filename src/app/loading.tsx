// src/app/loading.tsx
import { Brain } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 flex items-center justify-center">
            <Brain className="w-8 h-8 text-neon-blue animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-2xl border border-neon-blue/20 animate-ping" />
        </div>
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    </div>
  );
}
