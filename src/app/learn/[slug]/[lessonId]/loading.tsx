export default function LessonLoading() {
  return (
    <div className="min-h-screen bg-[#04070d] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-7xl gap-6">
        <div className="hidden w-80 shrink-0 rounded-3xl border border-white/10 bg-white/[0.03] p-4 lg:block">
          <div className="mb-4 h-5 w-40 animate-pulse rounded bg-white/10" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-4">
          <div className="h-14 animate-pulse rounded-2xl bg-white/[0.04]" />
          <div className="h-[420px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
          <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="h-8 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-full animate-pulse rounded bg-white/10" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
