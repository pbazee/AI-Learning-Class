"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AskAI } from "@/components/courses/AskAI";
import { ExpiredSubscriptionNotice } from "@/components/courses/ExpiredSubscriptionNotice";
import { CoursePreviewModal } from "@/components/courses/CoursePreviewModal";
import { CourseReviewsSection } from "@/components/courses/CourseReviewsSection";
import { useToast } from "@/components/ui/ToastProvider";
import { DEFAULT_ASK_AI_NAME } from "@/lib/site";
import {
  buildFreeCourseLoginPath,
  enrollInFreeCourse,
} from "@/lib/course-enrollment";
import { IMAGE_BLUR_DATA_URL } from "@/lib/image-placeholder";
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
import type { Course, CourseAccessState, CoursePreviewState } from "@/types";

const thumbnailFallback =
  "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=340&fit=crop";

export function CourseDetailClient({
  course,
  viewer,
  courseAccess,
  previewState,
  askAiEnabled,
  askAiAssistantLabel = DEFAULT_ASK_AI_NAME,
  expiredAccess,
}: {
  course: Course;
  viewer: { id: string; name?: string | null } | null;
  courseAccess?: CourseAccessState;
  previewState?: CoursePreviewState | null;
  askAiEnabled: boolean;
  askAiAssistantLabel?: string;
  expiredAccess?: {
    expiredAt?: string | null;
    planSlug?: string | null;
    billingCycle?: "monthly" | "yearly" | null;
  } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const modules = course.modules ?? [];
  const autoEnrollTriggeredRef = useRef(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(modules[0]?.id ?? null);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const { addItem, isInCart, removeItem } = useCartStore();
  const inCart = isInCart(course.id);
  const isFreeCourse = course.price === 0 || course.isFree;
  const resolvedCourseAccess = courseAccess ?? previewState?.courseAccess;
  const hasAccess = Boolean(resolvedCourseAccess?.hasAccess);
  const defaultLessonId = modules[0]?.lessons[0]?.id;
  const classroomHref =
    resolvedCourseAccess?.lessonHref ??
    (defaultLessonId ? `/learn/${course.slug}/${defaultLessonId}` : `/courses/${course.slug}`);
  const shouldAutoEnroll = searchParams.get("enroll") === "free";
  const hasPreviewContent =
    Boolean(previewState?.previewLessons?.length) ||
    Boolean(previewState?.previewVideoUrl) ||
    Boolean(course.previewVideoUrl);
  const previewLockedActionLabel = enrolling
    ? "Enrolling..."
    : isFreeCourse
      ? "Enroll Free"
      : inCart
        ? "Go to Cart"
        : "Add to Cart";
  const previewAccessActionLabel =
    (resolvedCourseAccess?.progress ?? 0) > 0 ? "Continue to Full Course" : "Go to Classroom";

  useEffect(() => {
    if (
      !shouldAutoEnroll ||
      !viewer?.id ||
      !isFreeCourse ||
      hasAccess ||
      autoEnrollTriggeredRef.current
    ) {
      return;
    }

    autoEnrollTriggeredRef.current = true;

    void (async () => {
      try {
        setEnrolling(true);
        removeItem(course.id);
        const payload = await enrollInFreeCourse(course.id);
        toast("Enrollment confirmed. Opening your course.", "success");
        router.replace(payload.redirectTo);
        router.refresh();
      } catch (error) {
        autoEnrollTriggeredRef.current = false;
        toast(error instanceof Error ? error.message : "Unable to enroll right now.", "error");
      } finally {
        setEnrolling(false);
      }
    })();
  }, [course.id, hasAccess, isFreeCourse, removeItem, router, shouldAutoEnroll, toast, viewer?.id]);

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

  async function handleLockedCourseAction() {
    if (isFreeCourse) {
      if (!viewer?.id) {
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

    if (inCart) {
      router.push("/cart");
      return;
    }

    addCourseToCart();
  }

  async function handlePrimaryAction() {
    if (hasAccess) {
      router.push(classroomHref);
      return;
    }

    await handleLockedCourseAction();
  }

  function handlePreviewAccessAction() {
    setPreviewOpen(false);
    router.push(classroomHref);
  }

  const discount =
    course.originalPrice && course.originalPrice > course.price
      ? Math.round((1 - course.price / course.originalPrice) * 100)
      : null;

  function renderPreviewTrigger(compact = false) {
    return (
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        disabled={!hasPreviewContent}
        className={cn(
          "group relative flex aspect-video w-full items-center justify-center overflow-hidden bg-slate-950 transition-all",
          compact ? "rounded-none" : "rounded-t-2xl",
          hasPreviewContent ? "cursor-pointer" : "cursor-not-allowed opacity-80"
        )}
      >
        <Image
          src={course.thumbnailUrl || thumbnailFallback}
          alt={course.title}
          fill
          quality={75}
          placeholder="blur"
          blurDataURL={IMAGE_BLUR_DATA_URL}
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover opacity-60 transition-all duration-500 group-hover:scale-[1.02] group-hover:opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/10 to-slate-950/70" />
        <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all group-hover:bg-white/30">
          <Play className="ml-1 h-7 w-7 text-white" />
        </div>
        <div className="absolute inset-x-0 bottom-3 z-10 text-center text-xs font-medium text-white/84">
          {hasPreviewContent ? "Preview this course" : "Preview coming soon"}
        </div>
      </button>
    );
  }

  return (
    <div className="min-h-screen">

      {expiredAccess ? (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <ExpiredSubscriptionNotice
            renewHref={`/checkout?plan=${expiredAccess.planSlug === "teams" ? "teams" : "pro"}&billing=${expiredAccess.billingCycle ?? "monthly"}`}
          />
        </div>
      ) : null}

      <div className="border-b border-primary-blue/10 bg-gradient-to-b from-primary-blue/10 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
            <div className="space-y-5 lg:hidden">
              <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
                {renderPreviewTrigger(true)}

                <div className="space-y-5 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-primary-blue">{course.categoryName}</span>
                    <span className="text-slate-400">&gt;</span>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        levelBadgeColor(course.level)
                      )}
                    >
                      {levelLabel(course.level)}
                    </span>
                  </div>

                  <div>
                    <h1 className="text-3xl font-black leading-tight text-foreground">
                      {course.title}
                    </h1>
                    <p className="mt-3 text-base leading-7 text-muted-foreground">
                      {course.shortDescription || course.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                    <div className="rounded-2xl border border-border bg-background/80 p-4">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-bold text-foreground">{course.rating}</span>
                      </div>
                      <p className="mt-2">{formatNumber(course.totalRatings)} ratings</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/80 p-4">
                      <div className="flex items-center gap-2 text-primary-blue">
                        <Users className="h-4 w-4" />
                        <span className="font-bold text-foreground">{formatNumber(course.totalStudents)}</span>
                      </div>
                      <p className="mt-2">active learners</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/80 p-4">
                      <div className="flex items-center gap-2 text-primary-blue">
                        <Clock className="h-4 w-4" />
                        <span className="font-bold text-foreground">{formatDuration(course.totalDuration)}</span>
                      </div>
                      <p className="mt-2">on-demand content</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/80 p-4">
                      <div className="flex items-center gap-2 text-primary-blue">
                        <BookOpen className="h-4 w-4" />
                        <span className="font-bold text-foreground">{course.totalLessons}</span>
                      </div>
                      <p className="mt-2">stacked lessons</p>
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-slate-950 p-5 text-white">
                    {hasAccess ? (
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-blue/20 bg-primary-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {resolvedCourseAccess?.statusLabel}
                      </div>
                    ) : null}
                    {isFreeCourse ? (
                      <div className="text-3xl font-black text-primary-blue">Free</div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-white">{formatPrice(course.price, course.currency)}</span>
                        {course.originalPrice && course.originalPrice > course.price && (
                          <span className="text-base text-white/50 line-through">
                            {formatPrice(course.originalPrice, course.currency)}
                          </span>
                        )}
                      </div>
                    )}
                    {discount ? (
                      <p className="mt-2 text-xs text-primary-blue">{discount}% off right now</p>
                    ) : null}

                    <div className="mt-5 space-y-3">
                      {hasAccess ? (
                        <button
                          type="button"
                          onClick={handlePrimaryAction}
                          className="w-full rounded-xl bg-primary-blue py-3.5 font-semibold text-white shadow-lg shadow-primary-blue/20 transition-all hover:bg-primary-blue/90 active:scale-[0.98]"
                        >
                          {resolvedCourseAccess?.actionLabel ?? "Continue Learning"}
                        </button>
                      ) : isFreeCourse ? (
                        <button
                          type="button"
                          onClick={handlePrimaryAction}
                          disabled={enrolling}
                          className="w-full rounded-xl bg-primary-blue py-3.5 font-semibold text-white shadow-lg shadow-primary-blue/20 transition-all hover:bg-primary-blue/90 disabled:opacity-70 active:scale-[0.98]"
                        >
                          {enrolling ? "Enrolling..." : "Enroll Free"}
                        </button>
                      ) : inCart ? (
                        <Link
                          href="/cart"
                          className="block rounded-xl border border-primary-blue/20 bg-primary-blue/10 py-3.5 text-center font-semibold text-primary-blue transition-all hover:bg-primary-blue/15 active:scale-[0.98]"
                        >
                          <Check className="mr-2 inline h-4 w-4" /> Go to Cart
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePrimaryAction}
                          className="w-full rounded-xl bg-primary-blue py-3.5 font-semibold text-white shadow-lg shadow-primary-blue/20 transition-all hover:bg-primary-blue/90 active:scale-[0.98]"
                        >
                          Add to Cart
                        </button>
                      )}

                      {askAiEnabled ? (
                        <button
                          onClick={() => setAskAiOpen(true)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-blue/20 bg-primary-blue/10 py-3 text-sm font-medium text-primary-blue transition-all hover:bg-primary-blue/15"
                        >
                          <Sparkles className="h-4 w-4" /> {askAiAssistantLabel} about this course
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <details className="overflow-hidden rounded-[24px] border border-border bg-card shadow-sm" open>
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left">
                  <div>
                    <p className="text-lg font-bold text-foreground">About this course</p>
                    <p className="mt-1 text-sm text-muted-foreground">The full course overview learners see on the detail page.</p>
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </summary>
                <div className="border-t border-border px-5 py-4">
                  <div className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {course.description}
                  </div>
                </div>
              </details>

              <details className="overflow-hidden rounded-[24px] border border-border bg-card shadow-sm" open>
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left">
                  <div>
                    <p className="text-lg font-bold text-foreground">What you&apos;ll learn</p>
                    <p className="mt-1 text-sm text-muted-foreground">A vertical, easy-to-scan mobile checklist.</p>
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </summary>
                <div className="border-t border-border px-5 py-4">
                  <div className="space-y-3">
                    {course.whatYouLearn.map((item) => (
                      <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-blue" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </details>

              <details className="overflow-hidden rounded-[24px] border border-border bg-card shadow-sm" open>
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left">
                  <div>
                    <p className="text-lg font-bold text-foreground">Curriculum</p>
                    <p className="mt-1 text-sm text-muted-foreground">Collapsible modules with lesson counts and previews.</p>
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </summary>
                <div className="border-t border-border px-5 py-4">
                  {modules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Curriculum details will appear here once lessons are published for this course.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {modules.map((module, moduleIndex) => (
                        <details key={module.id} className="overflow-hidden rounded-2xl border border-border bg-background/80" open={moduleIndex === 0}>
                          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-4 text-left">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary-blue/20 bg-primary-blue/10 text-xs font-bold text-primary-blue">
                                {moduleIndex + 1}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{module.title}</p>
                                <p className="text-xs text-muted-foreground">{module.lessons.length} lessons</p>
                              </div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </summary>
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
                                  <span className="text-sm text-foreground">{lesson.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {lesson.isPreview ? (
                                    <span className="rounded-full bg-primary-blue/10 px-2 py-0.5 text-xs text-primary-blue">
                                      Preview
                                    </span>
                                  ) : (
                                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                  {(lesson.duration ?? 0) > 0 ? (
                                    <span className="text-xs text-muted-foreground">
                                      {Math.floor((lesson.duration ?? 0) / 60)}m
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              </details>

              <details className="overflow-hidden rounded-[24px] border border-border bg-card shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left">
                  <div>
                    <p className="text-lg font-bold text-foreground">Reviews</p>
                    <p className="mt-1 text-sm text-muted-foreground">Stacked learner feedback and review form.</p>
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </summary>
                <div className="border-t border-border px-5 py-4">
                  <CourseReviewsSection
                    courseId={course.id}
                    courseSlug={course.slug}
                    reviews={course.reviews ?? []}
                    viewer={viewer}
                  />
                </div>
              </details>

              <details className="overflow-hidden rounded-[24px] border border-border bg-card shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left">
                  <div>
                    <p className="text-lg font-bold text-foreground">Tags</p>
                    <p className="mt-1 text-sm text-muted-foreground">Quick topics and skills covered in this course.</p>
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </summary>
                <div className="border-t border-border px-5 py-4">
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
              </details>
            </div>

            <div className="hidden min-w-0 space-y-10 lg:block lg:col-span-2">
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
                        quality={75}
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
                  <h2 className="mb-5 text-2xl font-black text-foreground">About This Course</h2>
                  <div className="max-w-4xl whitespace-pre-wrap text-base leading-8 text-muted-foreground">
                    {course.description}
                  </div>
                </div>

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

            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {renderPreviewTrigger()}

                <div className="p-6">
                  {hasAccess ? (
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-blue/20 bg-primary-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {resolvedCourseAccess?.statusLabel}
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
                        {resolvedCourseAccess?.actionLabel ?? "Continue Learning"}
                      </button>
                    ) : isFreeCourse ? (
                      <button
                        type="button"
                        onClick={handlePrimaryAction}
                        disabled={enrolling}
                        className="w-full rounded-xl bg-primary-blue py-3.5 font-semibold text-white transition-colors hover:bg-primary-blue/90 disabled:opacity-70"
                      >
                        {enrolling ? "Enrolling..." : "Enroll Free"}
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

                    {askAiEnabled ? (
                      <button
                        onClick={() => setAskAiOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-blue/20 bg-primary-blue/10 py-3 text-sm font-medium text-primary-blue transition-all hover:bg-primary-blue/15"
                      >
                        <Sparkles className="h-4 w-4" /> {askAiAssistantLabel} about this course
                      </button>
                    ) : null}
                  </div>

                  <p className="mt-4 text-center text-xs text-muted-foreground">30-day money-back guarantee</p>

                  <div className="mt-6 border-t border-border pt-6">
                    <p className="mb-3 text-sm font-semibold text-foreground">This course includes:</p>
                    <ul className="space-y-2">
                      {[
                        `${formatDuration(course.totalDuration)} on-demand video`,
                        `${course.totalLessons} lessons & exercises`,
                        "Downloadable resources & code",
                        `${askAiAssistantLabel} learning assistant`,
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

      <CoursePreviewModal
        accessActionLabel={previewAccessActionLabel}
        course={course}
        hasAccess={hasAccess}
        lockedActionLabel={previewLockedActionLabel}
        lockedActionPending={enrolling}
        lockedActionVariant={!isFreeCourse && inCart ? "cart" : "primary"}
        onAccessAction={handlePreviewAccessAction}
        onLockedAction={handleLockedCourseAction}
        onOpenChange={setPreviewOpen}
        open={previewOpen}
        previewState={previewState}
      />
      {askAiEnabled && askAiOpen ? (
        <AskAI
          courseTitle={course.title}
          assistantLabel={askAiAssistantLabel}
          onClose={() => setAskAiOpen(false)}
        />
      ) : null}
    </div>
  );
}
