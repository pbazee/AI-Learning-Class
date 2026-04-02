// src/components/ui/skeleton.tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl bg-white/5", className)} />;
}

export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#05070b] shadow-[0_30px_90px_-48px_rgba(2,6,23,0.9)]">
      <div className="grid min-h-[560px] aspect-[11/20] grid-rows-[73%_27%]">
        <div className="relative">
          <Skeleton className="h-full w-full rounded-none bg-white/8" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 sm:p-6">
            <Skeleton className="h-10 w-28 rounded-full bg-white/12" />
            <Skeleton className="h-11 w-11 rounded-full bg-white/12" />
          </div>
        </div>

        <div className="flex flex-col bg-[#070a0f] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <Skeleton className="h-5 w-full bg-white/10" />
          <Skeleton className="mt-2 h-5 w-4/5 bg-white/10" />
          <Skeleton className="mt-4 h-7 w-28 bg-white/10" />
          <div className="mt-3 flex items-center gap-2">
            <Skeleton className="h-4 w-20 bg-white/10" />
            <Skeleton className="h-4 w-16 bg-white/10" />
          </div>
          <div className="mt-auto pt-4">
            <Skeleton className="h-12 w-full rounded-[18px] bg-white/14" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CourseSectionSkeleton() {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <CourseCardSkeleton key={i} />)}
        </div>
      </div>
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card rounded-2xl border border-white/5 p-5 space-y-2">
            <Skeleton className="w-6 h-6 rounded-lg" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 glass-card rounded-2xl border border-white/5 p-6">
          <Skeleton className="h-4 w-32 mb-6" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="glass-card rounded-2xl border border-white/5 p-6">
          <Skeleton className="h-4 w-24 mb-6" />
          <Skeleton className="h-40 w-full rounded-full mx-auto" />
        </div>
      </div>
    </div>
  );
}
