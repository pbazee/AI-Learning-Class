"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AICopilot } from "@/components/courses/AICopilot";
import { CourseReviewsSection } from "@/components/courses/CourseReviewsSection";
import { useToast } from "@/components/ui/ToastProvider";
import { enrollInFreeCourse } from "@/lib/course-enrollment";
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
  CheckCircle2,
} from "lucide-react";
import {
  formatPrice,
  formatDuration,
  formatNumber,
  levelBadgeColor,
  levelLabel,
  cn,
} from "@/lib/utils";
import type { Course, CourseAccessState } from "@/types";

const thumbnailFallback =
  "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=340&fit=crop";

export function CourseDetailClient({
  course,
  viewer,
  courseAccess,
}: {
  course: Course;
  viewer: { id: string; name?: string | null } | null;
  courseAccess?: CourseAccessState;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const modules = course.modules ?? [];
  const [expandedModule, setExpandedModule] = useState<string | null>(modules[0]?.id ?? null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const { addItem, isInCart } = useCartStore();
  const inCart = isInCart(course.id);
  const isFreeCourse = course.price === 0 || course.isFree;
  const hasAccess = Boolean(courseAccess?.hasAccess);
  const canInstantEnroll = Boolean(viewer?.id) && isFreeCourse;

  function addCourseToCart() {
    if (!inCart) {
      addItem({
        courseId: course.id,
        title: course.title,
        price: course.price,
        originalPrice: course.originalPrice,
        thumbnailUrl: course.imageUrl || course.thumbnailUrl,
        instructorName: course.instructorName,
      });
    }
  }

  async function handlePrimaryAction() {
    if (hasAccess && courseAccess?.lessonHref) {
      router.push(courseAccess.lessonHref);
      return;
    }

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

    addCourseToCart();
  }

  const discount =
    course.originalPrice && course.originalPrice > course.price
      ? Math.round((1 - course.price / course.originalPrice) * 100)
      : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="border-b border-primary-blue/10 bg-gradient-to-b from-primary-blue/10 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
            <div className="min-w-0 space-y-10 lg:col-span-2">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-primary-blue">{course.categoryName}</span>
                  <span className="text-slate-600">&gt;</span>
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

                <p className="mb-6 max-w-4xl text-lg text-muted-foreground">
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
                    <span className="text-slate-500">({formatNumber(course.totalRatings)} ratings)</span>
                  </div>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Users className="h-4 w-4" /> {formatNumber(course.totalStudents)} students
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Globe className="h-4 w-4" /> {course.language || "English"}
                  </span>
                </div>

                <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary-blue" />
                    {formatDuration(course.totalDuration)} total
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-primary-blue" />
                    {course.totalLessons} lessons
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-primary-blue" />
                    Certificate of completion
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-primary-blue" />
                    Lifetime access
                  </span>
                </div>

                {course.instructorName && (
                  <div className="flex items-center gap-3">
                    {course.instructorAvatar && (
                      <Image
                        src={course.instructorAvatar}
                        alt={course.instructorName}
                        width={44}
                        height={44}
                        quality={100}
                        className="rounded-full ring-2 ring-primary-blue/30"
                      />
                    )}
                    <div>
                      <p className="text-xs text-slate-500">Created by</p>
                      <p className="font-semibold text-foreground">{course.instructorName}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-10">
                <div>
                  <h2 className="mb-5 text-2xl font-black text-foreground">What You&apos;ll Learn</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {course.whatYouLearn.map((item) => (
                      <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-blue" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="mb-2 text-2xl font-black text-foreground">Course Curriculum</h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    {course.totalLessons} lessons / {formatDuration(course.totalDuration)} total length
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
                            className="flex w-full items-center justify-between gap-3 p-4 text-left transition-all hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary-blue/20 bg-primary-blue/10 text-xs font-bold text-primary-blue">
                                {moduleIndex + 1}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-foreground">{module.title}</div>
                                <div className="text-xs text-muted-foreground">{module.lessons.length} lessons</div>
                              </div>
                            </div>
                            {expandedModule === module.id ? (
                              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                          </button>

                          {expandedModule === module.id && (
                            <div className="border-t border-border">
                              {module.lessons.map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                                      {lesson.type === "QUIZ" ? (
                                        <BarChart3 className="h-3.5 w-3.5 text-primary-blue" />
                                      ) : lesson.type === "PROJECT" || lesson.type === "ASSIGNMENT" ? (
                                        <Award className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                      ) : lesson.type === "PDF" || lesson.type === "TEXT" ? (
                                        <FileText className="h-3.5 w-3.5 text-primary-blue" />
                                      ) : (
                                        <Play className="h-3.5 w-3.5 text-muted-foreground" />
                                      )}
                                    </div>
                                    <span className="truncate text-sm text-foreground">{lesson.title}</span>
                                    {lesson.isPreview && (
                                      <span className="rounded-full bg-primary-blue/10 px-2 py-0.5 text-xs text-primary-blue">
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

                <CourseReviewsSection
                  courseId={course.id}
                  courseSlug={course.slug}
                  reviews={course.reviews ?? []}
                  viewer={viewer}
                />

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

            <div className="lg:col-span-1">
              <div className="sticky top-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <div className="group relative flex aspect-video cursor-pointer items-center justify-center bg-slate-800">
                  <Image
                    src={course.thumbnailUrl || thumbnailFallback}
                    alt={course.title}
                    fill
                    quality={100}
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
                  {hasAccess ? (
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-blue/20 bg-primary-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {courseAccess?.statusLabel}
                    </div>
                  ) : null}
                  {isFreeCourse ? (
                    <div className="mb-2 text-3xl font-black text-primary-blue">Free</div>
                  ) : (
                    <div className="mb-2 flex items-center gap-3">
                      <span className="text-3xl font-black text-foreground">{formatPrice(course.price)}</span>
                      {course.originalPrice && course.originalPrice > course.price && (
                        <span className="text-lg text-muted-foreground line-through">
                          {formatPrice(course.originalPrice)}
                        </span>
                      )}
                      {discount && <span className="text-sm font-bold text-primary-blue">{discount}% off</span>}
                    </div>
                  )}

                  {discount && (
                    <p className="mb-4 text-xs text-primary-blue">Flash sale - {discount}% off. Expires soon!</p>
                  )}

                  <div className="space-y-3">
                    {hasAccess ? (
                      <button
                        type="button"
                        onClick={handlePrimaryAction}
                        className="w-full rounded-xl bg-primary-blue py-3.5 font-semibold text-white transition-colors hover:bg-primary-blue/90"
                      >
                        {courseAccess?.actionLabel ?? "Continue Learning"}
                      </button>
                    ) : canInstantEnroll ? (
                      <button
                        type="button"
                        onClick={handlePrimaryAction}
                        disabled={enrolling}
                        className="w-full rounded-xl bg-primary-blue py-3.5 font-semibold text-white transition-colors hover:bg-primary-blue/90 disabled:opacity-70"
                      >
                        {enrolling ? "Enrolling..." : "Enroll for Free"}
                      </button>
                    ) : inCart ? (
                      <Link
                        href="/cart"
                        className="block rounded-xl border border-primary-blue/20 bg-primary-blue/10 py-3.5 text-center font-semibold text-primary-blue transition-all hover:bg-primary-blue/15"
                      >
                        <Check className="mr-2 inline h-4 w-4" /> Go to Cart
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePrimaryAction}
                        className="w-full rounded-xl bg-primary-blue py-3.5 font-semibold text-white transition-colors hover:bg-primary-blue/90"
                      >
                        Add to Cart
                      </button>
                    )}

                    <button
                      onClick={() => setCopilotOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-blue/20 bg-primary-blue/10 py-3 text-sm font-medium text-primary-blue transition-all hover:bg-primary-blue/15"
                    >
                      <Sparkles className="h-4 w-4" /> Ask AI Copilot about this course
                    </button>
                  </div>

                  <p className="mt-4 text-center text-xs text-muted-foreground">30-day money-back guarantee</p>

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
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary-blue" />
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

      {copilotOpen && <AICopilot courseTitle={course.title} onClose={() => setCopilotOpen(false)} />}

      <Footer />
    </div>
  );
}
