"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Loader2, Star } from "lucide-react";
import { IMAGE_BLUR_DATA_URL } from "@/lib/image-placeholder";
import { resolveMediaUrl } from "@/lib/media";
import {
  buildFreeCourseLoginPath,
  enrollInFreeCourse,
} from "@/lib/course-enrollment";
import { createClient } from "@/lib/supabase";
import { useCartStore } from "@/store/cart";
import { useToast } from "@/components/ui/ToastProvider";
import { cn, formatNumber, formatPrice, levelLabel } from "@/lib/utils";
import type { Course, CourseAccessState } from "@/types";

interface CourseCardProps {
  course: Course;
  index?: number;
  viewerId?: string | null;
  courseAccess?: CourseAccessState;
  isWishlisted?: boolean;
}

export function CourseCard({
  course,
  index = 0,
  viewerId,
  courseAccess,
  isWishlisted = false,
}: CourseCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { addItem, isInCart, removeItem } = useCartStore();
  const [enrolling, setEnrolling] = useState(false);
  const [wishlistPending, setWishlistPending] = useState(false);
  const [wishlisted, setWishlisted] = useState(isWishlisted);
  const inCart = isInCart(course.id);
  const isFreeCourse = course.price === 0 || course.isFree;
  const hasAccess = Boolean(courseAccess?.hasAccess);
  const heroImage = resolveMediaUrl({
    url: course.imageUrl || course.thumbnailUrl,
    path: course.imagePath,
    fallback: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1280&h=720&fit=crop",
  });
  const displayLevel = levelLabel(course.level).toUpperCase();
  const filledStars = Math.max(0, Math.min(5, Math.round(course.rating)));
  const hasDiscount = Boolean(course.originalPrice && course.originalPrice > course.price);
  const courseSummary = course.shortDescription || course.description;
  const ctaLabel = hasAccess
    ? courseAccess?.actionLabel ?? "Continue Learning"
    : enrolling
      ? "Enrolling..."
      : isFreeCourse
        ? "Enroll Free"
        : inCart
          ? "Added to Cart"
          : "Add to Cart";
  const buttonClassName = hasAccess
    ? "bg-primary-blue text-white shadow-[0_24px_44px_-28px_rgba(0,86,210,0.95)] hover:bg-primary-blue/90"
    : !isFreeCourse && inCart
      ? "border border-primary-blue/35 bg-primary-blue/16 text-white hover:bg-primary-blue/24"
      : "bg-primary-blue text-white shadow-[0_24px_44px_-28px_rgba(0,86,210,0.95)] hover:bg-primary-blue/90";

  useEffect(() => {
    setWishlisted(isWishlisted);
  }, [isWishlisted]);

  async function resolveActiveViewerId() {
    if (viewerId) {
      return viewerId;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      return user?.id ?? null;
    } catch {
      return null;
    }
  }

  async function handlePrimaryAction(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (isFreeCourse) {
      const activeViewerId = await resolveActiveViewerId();

      if (!activeViewerId) {
        router.push(buildFreeCourseLoginPath(course.slug));
        return;
      }

      try {
        setEnrolling(true);
        removeItem(course.id);
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

  async function handleWishlistToggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const activeViewerId = await resolveActiveViewerId();

    if (!activeViewerId) {
      toast("Please sign in to save courses to your wishlist.", "error");
      return;
    }

    const previousValue = wishlisted;
    setWishlisted((current) => !current);
    setWishlistPending(true);

    try {
      const response = await fetch(`/api/wishlist/${course.id}`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to update your wishlist right now.");
      }

      setWishlisted(Boolean(payload?.wishlisted));
      toast(
        payload?.wishlisted ? "Added to your wishlist." : "Removed from your wishlist.",
        "success"
      );

      if (pathname === "/wishlist") {
        router.refresh();
      }
    } catch (error) {
      setWishlisted(previousValue);
      toast(error instanceof Error ? error.message : "Unable to update your wishlist right now.", "error");
    } finally {
      setWishlistPending(false);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group h-full"
    >
      <div className="relative h-full overflow-hidden rounded-[30px] border border-white/10 bg-[#05070b] shadow-[0_30px_90px_-48px_rgba(2,6,23,0.9)] transition-all duration-500 hover:-translate-y-2 hover:border-primary-blue/30 hover:shadow-[0_38px_110px_-50px_rgba(0,86,210,0.55)]">
        <Link
          href={`/courses/${course.slug}`}
          aria-label={`Open ${course.title}`}
          className="absolute inset-0 z-10 rounded-[30px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070b]"
        />
        <div className="pointer-events-none relative z-20 flex h-full min-h-[448px] flex-col sm:min-h-[500px]">
          <div className="relative basis-[47%] overflow-hidden sm:basis-[48%] lg:basis-[52%]">
            <Image
              src={heroImage}
              alt={course.title}
              fill
              quality={75}
              placeholder="blur"
              blurDataURL={IMAGE_BLUR_DATA_URL}
              sizes="(min-width: 1536px) 22vw, (min-width: 1280px) 25vw, (min-width: 1024px) 30vw, (min-width: 640px) 42vw, 72vw"
              className="object-cover object-center brightness-[0.94] contrast-[1.08] saturate-[1.08] transition duration-700 ease-out group-hover:scale-[1.04] group-hover:brightness-[1.05] group-hover:saturate-[1.16]"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.18),transparent_32%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-transparent to-black/24" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/44 via-black/10 to-transparent" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 sm:p-6">
              <span className="rounded-full bg-emerald-500 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_24px_-16px_rgba(16,185,129,0.7)] sm:px-3 sm:py-1 sm:text-[10px]">
                {displayLevel}
              </span>

              <button
                type="button"
                onClick={handleWishlistToggle}
                disabled={wishlistPending}
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                className={cn(
                  "pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/18 bg-black/30 text-white backdrop-blur-md transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70",
                  wishlisted
                    ? "border-white/30 bg-white/95 text-primary-blue shadow-[0_20px_36px_-20px_rgba(255,255,255,0.55)]"
                    : "hover:border-primary-blue/35 hover:bg-white/95 hover:text-primary-blue"
                )}
              >
                <Heart className={cn("h-5 w-5", wishlisted && "fill-current")} />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col bg-[#070a0f] px-[18px] pb-5 pt-[18px] text-white sm:px-6 sm:pb-7 sm:pt-5">
            {hasAccess ? (
              <div className="mb-3 inline-flex items-center self-start rounded-full border border-primary-blue/25 bg-primary-blue/14 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-blue">
                {courseAccess?.statusLabel ?? "Enrolled"}
              </div>
            ) : null}

            <h3 className="min-h-[2.45rem] line-clamp-2 text-[1.06rem] font-black leading-[1.14] text-white sm:min-h-[2.7rem] sm:text-[1.18rem]">
              {course.title}
            </h3>

            {courseSummary ? (
              <p className="mt-2 min-h-[2.5rem] line-clamp-2 text-sm leading-5 text-white/68">
                {courseSummary}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
              <span className={cn("text-[1.42rem] font-black leading-none", isFreeCourse ? "text-primary-blue" : "text-white")}>
                {isFreeCourse ? "Free" : formatPrice(course.price, course.currency)}
              </span>
              {hasDiscount ? (
                <span className="text-sm font-medium text-white/42 line-through">
                  {formatPrice(course.originalPrice!, course.currency)}
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm text-white/68">
              <div className="flex items-center gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star
                    key={`${course.id}-star-${starIndex}`}
                    className={cn(
                      "h-3.5 w-3.5",
                      starIndex < filledStars ? "fill-current text-amber-400" : "text-white/16"
                    )}
                  />
                ))}
              </div>
              <span className="font-semibold text-white">{course.rating.toFixed(1)}</span>
              <span className="text-white/28">/</span>
              <span>{formatNumber(course.totalStudents)} students</span>
            </div>

            {hasAccess && (courseAccess?.progress ?? 0) > 0 ? (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-medium text-white/68">
                  <span>{courseAccess?.actionLabel ?? "Continue Learning"}</span>
                  <span className="text-white">{courseAccess?.progress ?? 0}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-primary-blue"
                    style={{ width: `${courseAccess?.progress ?? 0}%` }}
                  />
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={hasAccess ? handleResumeLearning : handlePrimaryAction}
              disabled={enrolling && !hasAccess}
              className={cn(
                "pointer-events-auto mt-auto inline-flex w-full items-center justify-center rounded-[16px] px-4 py-3 text-[13px] font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70",
                buttonClassName
              )}
            >
              {enrolling && !hasAccess ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {ctaLabel}
                </span>
              ) : (
                ctaLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
