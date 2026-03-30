"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AICopilot } from "@/components/courses/AICopilot";
import { useCartStore } from "@/store/cart";
import {
  Star,
  Clock,
  Users,
  BookOpen,
  Check,
  Play,
  Award,
  Globe,
  BarChart3,
  FileText,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import {
  formatPrice,
  formatDuration,
  formatNumber,
  levelBadgeColor,
  levelLabel,
  cn,
} from "@/lib/utils";
import type { Course } from "@/types";

const thumbnailFallback =
  "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=340&fit=crop";

export function CourseDetailClient({ course }: { course: Course }) {
  const modules = course.modules ?? [];
  const [expandedModule, setExpandedModule] = useState<string | null>(modules[0]?.id ?? null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const { addItem, isInCart } = useCartStore();
  const inCart = isInCart(course.id);

  function handleEnroll() {
    if (!inCart) {
      addItem({
        courseId: course.id,
        title: course.title,
        price: course.price,
        originalPrice: course.originalPrice,
        thumbnailUrl: course.thumbnailUrl,
        instructorName: course.instructorName,
      });
    }
  }

  const discount =
    course.originalPrice && course.originalPrice > course.price
      ? Math.round((1 - course.price / course.originalPrice) * 100)
      : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <div className="border-b border-blue-100 bg-gradient-to-b from-blue-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {course.categoryName}
                  </span>
                  <span className="text-slate-600">›</span>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      levelBadgeColor(course.level)
                    )}
                  >
                    {levelLabel(course.level)}
                  </span>
                </div>

                <h1 className="mb-4 text-3xl font-black leading-tight text-foreground sm:text-4xl">
                  {course.title}
                </h1>

                <p className="mb-6 text-lg text-muted-foreground">
                  {course.shortDescription || course.description}
                </p>

                <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, index) => (
                        <Star
                          key={index}
                          className={cn(
                            "h-4 w-4",
                            index < Math.floor(course.rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-600"
                          )}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-amber-400">{course.rating}</span>
                    <span className="text-slate-500">
                      ({formatNumber(course.totalRatings)} ratings)
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Users className="h-4 w-4" /> {formatNumber(course.totalStudents)} students
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Globe className="h-4 w-4" /> {course.language || "English"}
                  </span>
                </div>

                {course.instructorName && (
                  <div className="mb-6 flex items-center gap-3">
                    {course.instructorAvatar && (
                      <Image
                        src={course.instructorAvatar}
                        alt={course.instructorName}
                        width={44}
                        height={44}
                        className="rounded-full ring-2 ring-blue-500/30"
                      />
                    )}
                    <div>
                      <p className="text-xs text-slate-500">Created by</p>
                      <p className="font-semibold text-white">{course.instructorName}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {formatDuration(course.totalDuration)} total
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {course.totalLessons} lessons
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Certificate of completion
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Lifetime access
                  </span>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="sticky top-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <div className="group relative flex aspect-video cursor-pointer items-center justify-center bg-slate-800">
                    <Image
                      src={course.thumbnailUrl || thumbnailFallback}
                      alt={course.title}
                      fill
                      className="object-cover opacity-60 transition-all group-hover:opacity-80"
                    />
                    <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all group-hover:bg-white/30">
                      <Play className="ml-1 h-7 w-7 text-white" />
                    </div>
                    <div className="absolute inset-x-0 bottom-3 text-center text-xs text-white/80">
                      Preview this course
                    </div>
                  </div>

                  <div className="p-6">
                    {course.isFree ? (
                      <div className="mb-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        Free
                      </div>
                    ) : (
                      <div className="mb-2 flex items-center gap-3">
                        <span className="text-3xl font-black text-foreground">
                          {formatPrice(course.price)}
                        </span>
                        {course.originalPrice && course.originalPrice > course.price && (
                          <span className="text-lg text-muted-foreground line-through">
                            {formatPrice(course.originalPrice)}
                          </span>
                        )}
                        {discount && (
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {discount}% off
                          </span>
                        )}
                      </div>
                    )}

                    {discount && (
                      <p className="mb-4 text-xs text-rose-600 dark:text-rose-400">
                        Flash sale - {discount}% off. Expires soon!
                      </p>
                    )}

                    <div className="space-y-3">
                      {inCart ? (
                        <Link
                          href="/cart"
                          className="block rounded-xl border border-emerald-200 bg-emerald-50 py-3.5 text-center font-semibold text-emerald-700 transition-all hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
                        >
                          <Check className="mr-2 inline h-4 w-4" /> Go to Cart
                        </Link>
                      ) : (
                        <button
                          onClick={handleEnroll}
                          className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                          {course.isFree ? "Enroll for Free" : "Add to Cart"}
                        </button>
                      )}

                      <button
                        onClick={() => setCopilotOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-3 text-sm font-medium text-blue-700 transition-all hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
                      >
                        <Sparkles className="h-4 w-4" /> Ask AI Copilot about this course
                      </button>
                    </div>

                    <p className="mt-4 text-center text-xs text-muted-foreground">
                      30-day money-back guarantee
                    </p>

                    <div className="mt-6 border-t border-border pt-6">
                      <p className="mb-3 text-sm font-semibold text-foreground">This course includes:</p>
                      <ul className="space-y-2">
                        {[
                          `${formatDuration(course.totalDuration)} on-demand video`,
                          `${course.totalLessons} lessons & exercises`,
                          "Downloadable resources & code",
                          "AI co-pilot learning assistant",
                          "Certificate of completion",
                          "Lifetime access",
                        ].map((item) => (
                          <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="space-y-12 lg:pr-[calc(33.333%+2.5rem)]">
            <div>
              <h2 className="mb-6 text-2xl font-black text-foreground">What You&apos;ll Learn</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {course.whatYouLearn.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-2xl font-black text-foreground">Course Curriculum</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                {course.totalLessons} lessons · {formatDuration(course.totalDuration)} total length
              </p>

              {modules.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
                  Curriculum details will appear here once lessons are published for this course.
                </div>
              ) : (
                <div className="space-y-3">
                  {modules.map((module, moduleIndex) => (
                    <div
                      key={module.id}
                      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                    >
                      <button
                        onClick={() =>
                          setExpandedModule(expandedModule === module.id ? null : module.id)
                        }
                        className="flex w-full items-center justify-between p-4 text-left transition-all hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
                            {moduleIndex + 1}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{module.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {module.lessons.length} lessons
                            </div>
                          </div>
                        </div>
                        {expandedModule === module.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      {expandedModule === module.id && (
                        <div className="border-t border-border">
                          {module.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                                  {lesson.type === "QUIZ" ? (
                                    <BarChart3 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                                  ) : lesson.type === "PROJECT" || lesson.type === "ASSIGNMENT" ? (
                                    <Award className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  ) : lesson.type === "PDF" || lesson.type === "TEXT" ? (
                                    <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </div>
                                <span className="text-sm text-foreground">{lesson.title}</span>
                                {lesson.isPreview && (
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                    Preview
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {!lesson.isPreview && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                                {(lesson.duration ?? 0) > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {Math.floor((lesson.duration ?? 0) / 60)}m
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-4 text-lg font-bold text-foreground">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {course.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {copilotOpen && <AICopilot courseTitle={course.title} onClose={() => setCopilotOpen(false)} />}

      <Footer />
    </div>
  );
}
