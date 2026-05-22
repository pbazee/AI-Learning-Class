"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { Play } from "lucide-react";
import { IMAGE_BLUR_DATA_URL } from "@/lib/image-placeholder";
import { formatDuration } from "@/lib/utils";

const thumbnailFallback =
  "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=340&fit=crop";

type DashboardCourseEnrollment = {
  id: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastLessonTitle?: string;
  lessonHref: string;
  actionLabel: "Continue Learning" | "Go to Classroom";
  remainingMinutes: number;
  course: {
    slug: string;
    title: string;
    thumbnailUrl?: string;
  };
};

async function fetchDashboardEnrollments() {
  const response = await fetch("/api/dashboard/courses", {
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to load your course progress right now.");
  }

  const payload = (await response.json()) as { enrollments?: DashboardCourseEnrollment[] };
  return payload.enrollments ?? [];
}

function DashboardCoursesListContent({
  initialEnrollments,
}: {
  initialEnrollments: DashboardCourseEnrollment[];
}) {
  const query = useQuery({
    queryKey: ["dashboard", "courses"],
    queryFn: fetchDashboardEnrollments,
    initialData: initialEnrollments,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const enrollments = query.data ?? initialEnrollments;
  const skeletonRows = useMemo(
    () =>
      Array.from({
        length: Math.max(Math.min(initialEnrollments.length || 2, 3), 1),
      }),
    [initialEnrollments.length]
  );

  if (query.isPending && enrollments.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        {skeletonRows.map((_, index) => (
          <div
            key={`dashboard-course-skeleton-${index}`}
            className="animate-pulse rounded-2xl border border-border p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="h-44 w-full rounded-xl bg-muted sm:h-16 sm:w-24 sm:shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
                <div className="h-1.5 w-full rounded-full bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (enrollments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4" aria-busy={query.isFetching}>
      {query.isFetching ? (
        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary-blue" />
        </div>
      ) : null}

      {enrollments.map((enrollment) => (
        <div key={enrollment.id} className="rounded-2xl border border-border p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative h-44 w-full overflow-hidden rounded-xl sm:h-16 sm:w-24 sm:shrink-0">
              <Image
                src={enrollment.course.thumbnailUrl || thumbnailFallback}
                alt={enrollment.course.title}
                fill
                quality={75}
                placeholder="blur"
                blurDataURL={IMAGE_BLUR_DATA_URL}
                sizes="(min-width: 640px) 96px, 100vw"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/courses/${enrollment.course.slug}`}
                className="line-clamp-1 text-sm font-bold text-foreground transition-colors hover:text-primary-blue"
              >
                {enrollment.course.title}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">
                {enrollment.lastLessonTitle
                  ? `Latest progress: ${enrollment.lastLessonTitle}`
                  : "Start the classroom from your first lesson."}
              </p>
              <div className="mt-2">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary-blue transition-[width] duration-300"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {enrollment.progress}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {enrollment.completedLessons}/{enrollment.totalLessons} lessons completed
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDuration(enrollment.remainingMinutes)} left
                </p>
              </div>
            </div>
            <Link
              href={enrollment.lessonHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90 sm:self-start"
            >
              <Play className="h-4 w-4" />
              {enrollment.actionLabel}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardCoursesList({
  initialEnrollments,
}: {
  initialEnrollments: DashboardCourseEnrollment[];
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardCoursesListContent initialEnrollments={initialEnrollments} />
    </QueryClientProvider>
  );
}
