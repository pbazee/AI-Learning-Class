// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency = "USD"): string {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(price);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatProgress(progress: number): string {
  return `${Math.round(progress)}%`;
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function levelBadgeColor(level: string) {
  switch (level) {
    case "BEGINNER": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "INTERMEDIATE": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "ADVANCED": return "bg-rose-500/20 text-rose-400 border-rose-500/30";
    default: return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  }
}

export function levelLabel(level: string) {
  return level.charAt(0) + level.slice(1).toLowerCase().replace("_levels", " Levels");
}
