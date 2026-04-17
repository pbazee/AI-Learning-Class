"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Sparkles,
  Star,
} from "lucide-react";
import { CourseCard } from "@/components/courses/CourseCard";
import { useStorefrontPersonalization } from "@/components/storefront/StorefrontPersonalizationProvider";
import { cn } from "@/lib/utils";
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
  const personalization = useStorefrontPersonalization();
  const Icon = badgeIcons[badgeIcon];
  const colorClass = badgeColors[badgeIcon];
  const displayed = courses.slice(0, maxItems);
  const effectiveViewerId = viewerId ?? personalization.viewerId;
  const effectiveCourseAccessMap = courseAccessMap ?? personalization.courseAccessMap;
  const effectiveWishlistCourseIds =
    wishlistCourseIds ?? personalization.wishlistCourseIds;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(displayed.length > 1);

  useEffect(() => {
    const node = scrollerRef.current;

    if (!node) {
      return;
    }

    const updateScrollState = () => {
      const maxScrollLeft = Math.max(node.scrollWidth - node.clientWidth, 0);
      setCanScrollLeft(node.scrollLeft > 8);
      setCanScrollRight(maxScrollLeft - node.scrollLeft > 8);
    };

    updateScrollState();
    node.addEventListener("scroll", updateScrollState, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollState) : null;
    resizeObserver?.observe(node);
    window.addEventListener("resize", updateScrollState);

    return () => {
      node.removeEventListener("scroll", updateScrollState);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [displayed.length]);

  function scrollCards(direction: "left" | "right") {
    const node = scrollerRef.current;

    if (!node) {
      return;
    }

    const distance = node.clientWidth * 0.88;
    node.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  }

  return (
    <section className="section-shell">
      <div className="section-frame">
        <div className="relative z-20 mb-5 flex flex-col gap-4 sm:mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              {badge ? (
                <div
                  className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${colorClass}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {badge}
                </div>
              ) : null}
              <h2 className="text-2xl font-black text-foreground sm:text-3xl">{title}</h2>
              {subtitle ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={viewAllHref}
                scroll
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-primary-blue shadow-sm hover:border-primary-blue/30 hover:bg-primary-blue/10"
              >
                {viewAllLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>

              {displayed.length > 1 ? (
                <div className="hidden items-center gap-2 lg:flex">
                  <button
                    type="button"
                    onClick={() => scrollCards("left")}
                    disabled={!canScrollLeft}
                    aria-label={`Scroll ${title} left`}
                    className={cn(
                      "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition",
                      canScrollLeft
                        ? "hover:border-primary-blue/30 hover:bg-primary-blue/10 hover:text-primary-blue"
                        : "cursor-not-allowed opacity-45"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCards("right")}
                    disabled={!canScrollRight}
                    aria-label={`Scroll ${title} right`}
                    className={cn(
                      "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition",
                      canScrollRight
                        ? "hover:border-primary-blue/30 hover:bg-primary-blue/10 hover:text-primary-blue"
                        : "cursor-not-allowed opacity-45"
                    )}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <motion.div
          ref={scrollerRef}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-0 lg:px-0"
        >
          {displayed.map((course, index) => (
            <div
              key={course.id}
              className="min-w-0 shrink-0 snap-start basis-[72vw] sm:basis-[20.5rem] lg:basis-[calc((100%-3.75rem)/4)]"
            >
              <CourseCard
                course={course}
                index={index}
                viewerId={effectiveViewerId}
                courseAccess={effectiveCourseAccessMap?.[course.id]}
                isWishlisted={effectiveWishlistCourseIds?.includes(course.id)}
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
