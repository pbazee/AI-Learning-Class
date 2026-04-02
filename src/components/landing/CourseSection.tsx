"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Flame, Star, Sparkles, Clock } from "lucide-react";
import { CourseCard } from "@/components/courses/CourseCard";
import type { Course, CourseAccessState } from "@/types";

interface CourseSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeIcon?: "flame" | "star" | "spark" | "clock";
  courses: Course[];
  viewAllHref?: string;
  viewAllLabel?: string;
  maxItems?: number;
  viewerId?: string | null;
  courseAccessMap?: Record<string, CourseAccessState>;
  wishlistCourseIds?: string[];
}

const badgeIcons = {
  flame: Flame,
  star: Star,
  spark: Sparkles,
  clock: Clock,
};

const badgeColors = {
  flame: "border-orange-200 bg-orange-50 text-orange-700",
  star: "border-amber-200 bg-amber-50 text-amber-700",
  spark: "border-primary-blue/20 bg-primary-blue/10 text-primary-blue",
  clock: "border-slate-200 bg-slate-50 text-slate-700",
};

export function CourseSection({
  title,
  subtitle,
  badge,
  badgeIcon = "spark",
  courses,
  viewAllHref = "/courses",
  viewAllLabel = "View all",
  maxItems = 4,
  viewerId,
  courseAccessMap,
  wishlistCourseIds,
}: CourseSectionProps) {
  const Icon = badgeIcons[badgeIcon];
  const colorClass = badgeColors[badgeIcon];
  const displayed = courses.slice(0, maxItems);

  return (
    <section className="section-shell">
      <div className="section-frame">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {badge && (
              <div
                className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${colorClass}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {badge}
              </div>
            )}
            <h2 className="text-2xl font-black text-foreground sm:text-3xl">{title}</h2>
            {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>}
          </div>

          <Link
            href={viewAllHref}
            scroll
            className="hidden items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-primary-blue shadow-sm hover:border-primary-blue/30 hover:bg-primary-blue/10 sm:inline-flex"
          >
            {viewAllLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {displayed.map((course, i) => (
            <CourseCard
              key={course.id}
              course={course}
              index={i}
              viewerId={viewerId}
              courseAccess={courseAccessMap?.[course.id]}
              isWishlisted={wishlistCourseIds?.includes(course.id)}
            />
          ))}
        </motion.div>

        <div className="mt-8 flex justify-center sm:hidden">
          <Link
            href={viewAllHref}
            scroll
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-primary-blue shadow-sm hover:border-primary-blue/30 hover:bg-primary-blue/10 sm:w-auto"
          >
            {viewAllLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
