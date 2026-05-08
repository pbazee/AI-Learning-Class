export default function CourseDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-primary-blue/10 bg-gradient-to-b from-primary-blue/10 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
            <div className="space-y-5 lg:col-span-2">
              <div className="h-5 w-40 animate-pulse rounded-full bg-muted" />
              <div className="h-14 w-4/5 animate-pulse rounded-2xl bg-muted" />
              <div className="h-20 w-full animate-pulse rounded-3xl bg-muted" />
              <div className="flex flex-wrap gap-3">
                <div className="h-5 w-36 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-32 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-[24px] bg-card" />
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
              <div className="aspect-video animate-pulse bg-muted" />
              <div className="space-y-4 p-6">
                <div className="h-8 w-28 animate-pulse rounded-xl bg-muted" />
                <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
                <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
                <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
