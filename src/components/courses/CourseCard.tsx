"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Clock, Users, BookOpen, ShoppingCart, Check, Zap } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice, formatDuration, formatNumber, levelBadgeColor, levelLabel, cn } from "@/lib/utils";
import type { Course } from "@/types";

interface CourseCardProps {
  course: Course;
  index?: number;
}

export function CourseCard({ course, index = 0 }: CourseCardProps) {
  const { addItem, isInCart } = useCartStore();
  const inCart = isInCart(course.id);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      courseId: course.id,
      title: course.title,
      price: course.price,
      originalPrice: course.originalPrice,
      thumbnailUrl: course.thumbnailUrl,
      instructorName: course.instructorName,
    });
  }

  const discount = course.originalPrice && course.originalPrice > course.price
    ? Math.round((1 - course.price / course.originalPrice) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <Link href={`/courses/${course.slug}`} className="block h-full">
        <div className="relative h-full bg-card rounded-2xl overflow-hidden border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-md flex flex-col">

          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={course.thumbnailUrl || "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=340&fit=crop"}
              alt={course.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              {course.isTrending && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white">
                  <Zap className="w-3 h-3" /> Trending
                </span>
              )}
              {course.isNew && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
                  New
                </span>
              )}
              {course.isFree && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white">
                  Free
                </span>
              )}
            </div>

            {/* Level */}
            <div className="absolute bottom-3 left-3">
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-sm", levelBadgeColor(course.level))}>
                {levelLabel(course.level)}
              </span>
            </div>

            {/* Discount */}
            {discount && (
              <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center">
                <span className="text-xs font-black text-white">-{discount}%</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col flex-1 p-5">
            {/* Category */}
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">{course.categoryName}</span>

            {/* Title */}
            <h3 className="font-bold text-foreground leading-snug mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {course.title}
            </h3>

            {/* Instructor */}
            {course.instructorName && (
              <p className="text-xs text-muted-foreground mb-3">{course.instructorName}</p>
            )}

            {/* Rating */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3.5 h-3.5",
                      i < Math.floor(course.rating)
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-300 dark:text-slate-600"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-amber-500">{course.rating}</span>
              <span className="text-xs text-muted-foreground">({formatNumber(course.totalRatings)})</span>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(course.totalDuration)}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {course.totalLessons} lessons
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {formatNumber(course.totalStudents)}
              </span>
            </div>

            {/* Price + Cart */}
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
              <div>
                {course.isFree ? (
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">Free</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-foreground">{formatPrice(course.price)}</span>
                    {course.originalPrice && course.originalPrice > course.price && (
                      <span className="text-sm text-muted-foreground line-through">{formatPrice(course.originalPrice)}</span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleAddToCart}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                  inCart
                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                    : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/60"
                )}
              >
                {inCart ? (
                  <><Check className="w-4 h-4" /> Added</>
                ) : (
                  <><ShoppingCart className="w-4 h-4" /> Add</>
                )}
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
