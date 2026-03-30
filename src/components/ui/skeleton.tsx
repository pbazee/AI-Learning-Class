// src/components/ui/skeleton.tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl bg-white/5", className)} />;
}

export function CourseCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
      <Skeleton className="aspect-video" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-28" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex justify-between pt-3 border-t border-white/5">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-20 rounded-xl" />
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
