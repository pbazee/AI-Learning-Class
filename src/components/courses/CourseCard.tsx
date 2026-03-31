"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Check, Loader2, Play, ShoppingCart, Star } from "lucide-react";
import { resolveMediaUrl } from "@/lib/media";
import { enrollInFreeCourse } from "@/lib/course-enrollment";
import { useCartStore } from "@/store/cart";
import { useToast } from "@/components/ui/ToastProvider";
import { cn, formatDuration, formatNumber, formatPrice, levelBadgeColor, levelLabel } from "@/lib/utils";
import type { Course, CourseAccessState } from "@/types";

interface CourseCardProps {
  course: Course;
  index?: number;
  viewerId?: string | null;
  courseAccess?: CourseAccessState;
}

export function CourseCard({ course, index = 0, viewerId, courseAccess }: CourseCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { addItem, isInCart } = useCartStore();
  const [enrolling, setEnrolling] = useState(false);
  const inCart = isInCart(course.id);
  const isFreeCourse = course.price === 0 || course.isFree;
  const hasAccess = Boolean(courseAccess?.hasAccess);
  const canInstantEnroll = Boolean(viewerId) && isFreeCourse;
  const heroImage = resolveMediaUrl({
    url: course.imageUrl || course.thumbnailUrl,
    path: course.imagePath,
    fallback: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&h=1600&fit=crop",
  });
  const durationLabel = course.totalDuration > 0 ? formatDuration(course.totalDuration) : "Self-paced";

  async function handlePrimaryAction(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (canInstantEnroll) {
      try {
        setEnrolling(true);
        const payload = await enrollInFreeCourse(course.id);
        toast("Enrollment confirmed. Opening your course.", "success");
        router.push(payload.redirectTo);
        router.refresh();
      } catch (error) {
        toast(error instanceof Error ? error.message : "Unable to enroll right now.", "error");
      } finally {
        setEnrolling(false);
      }
      return;
    }

    addItem({
      courseId: course.id,
      title: course.title,
      price: course.price,
      originalPrice: course.originalPrice,
      thumbnailUrl: course.imageUrl || course.thumbnailUrl,
      instructorName: course.instructorName,
    });
  }

  function handleResumeLearning(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (courseAccess?.lessonHref) {
      router.push(courseAccess.lessonHref);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <Link href={`/courses/${course.slug}`} className="block h-full">
        <div className="relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-[0_28px_80px_-40px_rgba(2,6,23,0.95)] transition-all duration-500 hover:scale-[1.02] hover:border-primary-blue/35 hover:shadow-[0_36px_120px_-44px_rgba(59,130,246,0.38)]">
          <Image
            src={heroImage}
            alt={course.title}
            fill
            quality={100}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-slate-950/20" />
          <div className="absolute inset-x-0 bottom-0 h-[54%] bg-gradient-to-t from-slate-950 via-slate-950/96 via-45% to-transparent" />

          <div className="relative z-10 flex h-full flex-col p-5 text-white sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              {hasAccess ? (
                <span className="rounded-[10px] border border-primary-blue/30 bg-primary-blue/12 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-blue backdrop-blur-md">
                  {courseAccess?.statusLabel}
                </span>
              ) : null}
              <span
                className={cn(
                  "rounded-[10px] border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-md",
                  levelBadgeColor(course.level)
                )}
              >
                {levelLabel(course.level)}
              </span>
              {course.categoryName ? (
                <span className="max-w-[11rem] truncate rounded-[10px] border border-white/12 bg-black/38 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/82 backdrop-blur-md">
                  {course.categoryName}
                </span>
              ) : null}
            </div>

            <div className="mt-auto max-w-[16.5rem] space-y-3 pt-24 sm:pt-28">
              <div className="space-y-3">
                {/* Updated: smaller title + quieter pricing keep the catalog easier to scan. */}
                <h3 className="line-clamp-2 text-[1.18rem] font-black leading-tight text-white drop-shadow-[0_4px_14px_rgba(2,6,23,0.84)] sm:text-[1.28rem]">
                  {course.title}
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-100 sm:text-sm">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-semibold">{course.rating.toFixed(1)}</span>
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    </span>
                    <p className="text-slate-200/88">{formatNumber(course.totalStudents)} students</p>
                  </div>

                  <div className="space-y-1 text-right">
                    <p>{durationLabel}</p>
                    <p className="text-slate-200/88">{course.totalLessons} lessons</p>
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between gap-2.5 border-t border-white/12 pt-3">
                <div className="min-w-0">
                  {isFreeCourse ? (
                    <span className="text-[1.35rem] font-semibold leading-none text-primary-blue drop-shadow-[0_4px_14px_rgba(59,130,246,0.4)]">
                      Free
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[1.25rem] font-semibold leading-none text-white drop-shadow-[0_4px_14px_rgba(2,6,23,0.8)]">
                        {formatPrice(course.price)}
                      </span>
                      {course.originalPrice && course.originalPrice > course.price ? (
                        <span className="text-xs text-slate-300/72 line-through">{formatPrice(course.originalPrice)}</span>
                      ) : null}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={hasAccess ? handleResumeLearning : handlePrimaryAction}
                  disabled={enrolling && !hasAccess}
                  className={cn(
                    "inline-flex min-w-[116px] items-center justify-center gap-2 rounded-[16px] border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all duration-300 disabled:opacity-70",
                    hasAccess
                      ? "border-primary-blue bg-primary-blue text-white shadow-[0_16px_32px_-18px_rgba(59,130,246,0.9)] hover:bg-primary-blue/90"
                      : canInstantEnroll
                      ? "border-primary-blue bg-primary-blue text-white shadow-[0_16px_32px_-18px_rgba(59,130,246,0.9)] hover:bg-primary-blue/90"
                      : inCart
                        ? "border-primary-blue/25 bg-primary-blue/12 text-white"
                        : "border-primary-blue bg-primary-blue text-white shadow-[0_16px_32px_-18px_rgba(59,130,246,0.9)] hover:bg-primary-blue/90"
                  )}
                >
                  {hasAccess ? (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      {courseAccess?.actionLabel ?? "Continue Learning"}
                    </>
                  ) : enrolling ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Enrolling
                    </>
                  ) : canInstantEnroll ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Enroll Free
                    </>
                  ) : inCart ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Added
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
