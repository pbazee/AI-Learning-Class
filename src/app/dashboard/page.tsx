import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { IMAGE_BLUR_DATA_URL } from "@/lib/image-placeholder";
import {
  Award,
  CreditCard,
  BookOpen,
  Clock,
  Play,
  ShoppingBag,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  BadgeCheck,
} from "lucide-react";
import {
  getCurrentUserProfile,
  getUserAffiliateStatus,
  getUserCertificates,
  getUserEnrollments,
} from "@/lib/data";
import { getUserWorkspaceNotes } from "@/lib/lesson-player";
import { prisma } from "@/lib/prisma";
import { getUserTeamWorkspaceSummary } from "@/lib/team-workspace";
import { formatDuration } from "@/lib/utils";
import { ReferEarnCard } from "@/components/dashboard/refer-earn-card";
import { LearnerInboxPanel } from "@/components/dashboard/LearnerInboxPanel";
import { WorkspaceNotesPanel } from "@/components/dashboard/WorkspaceNotesPanel";
import { ResetOnboardingButton } from "@/components/onboarding/ResetOnboardingButton";


const thumbnailFallback =
  "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=340&fit=crop";

export default async function DashboardPage() {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const onboardingProfile = user as { onboardingRecommendations?: string[] | null };

  const [
    enrollments,
    certificates,
    workspaceNotes,
    completedLessons,
    affiliateStatus,
    teamWorkspace,
    purchasedItems,
    activeSubscription,
    latestSubscription,
    inboxConversations,
  ] = await Promise.all([
    getUserEnrollments(user.id),
    getUserCertificates(user.id),
    getUserWorkspaceNotes(user.id, 8).catch((error) => {
      console.error("[dashboard] Unable to load workspace notes.", error);
      return [];
    }),
    prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
        isCompleted: true,
      },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  select: {
                    title: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }).catch((error) => {
      console.error("[dashboard] Unable to load completed lessons.", error);
      return [];
    }),
    getUserAffiliateStatus(user.id),
    getUserTeamWorkspaceSummary(user.id).catch((error) => {
      console.error("[dashboard] Unable to load team workspace summary.", error);
      return null;
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          userId: user.id,
          status: "COMPLETED",
        },
      },
      select: {
        courseId: true,
      },
    }).catch((error) => {
      console.error("[dashboard] Unable to load purchased course items.", error);
      return [];
    }),
    prisma.userSubscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      },
      include: {
        plan: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        currentPeriodEnd: "desc",
      },
    }).catch((error) => {
      console.error("[dashboard] Unable to load active subscription.", error);
      return null;
    }),
    prisma.userSubscription.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        plan: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        currentPeriodEnd: "desc",
      },
    }).catch((error) => {
      console.error("[dashboard] Unable to load subscription history.", error);
      return null;
    }),
    prisma.contactMessage.findMany({
      where: {
        email: {
          equals: user.email,
          mode: "insensitive",
        },
        replies: {
          some: {
            isAdmin: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        replies: {
          where: { isAdmin: true },
          orderBy: { createdAt: "asc" },
        },
      },
      take: 8,
    }).catch((error) => {
      console.error("[dashboard] Unable to load learner inbox conversations.", error);
      return [];
    }),
  ]);

  const recommendationSource = onboardingProfile.onboardingRecommendations;
  const recommendedCourseIds =
    Array.isArray(recommendationSource)
      ? recommendationSource
      : recommendationSource && typeof recommendationSource === "object"
        ? Object.values(recommendationSource).filter(
            (value): value is string => typeof value === "string"
          )
        : [];
  const recommendedCourses =
    recommendedCourseIds.length > 0
      ? await prisma.course.findMany({
          where: {
            id: { in: recommendedCourseIds },
            isPublished: true,
          },
          include: {
            category: true,
          },
          take: 3,
        }).catch((error) => {
          console.error("[dashboard] Unable to load recommended courses.", error);
          return [];
        })
      : [];
  const showLearningPathHero = enrollments.length === 0 && recommendedCourses.length > 0;
  const isSubscriptionExpired = Boolean(
    !activeSubscription &&
      latestSubscription?.currentPeriodEnd &&
      latestSubscription.currentPeriodEnd < new Date()
  );

  const totalCompletedSeconds = completedLessons.reduce(
    (sum, item) => sum + (item.lesson.duration ?? 0),
    0
  );
  const totalHours = Math.round(totalCompletedSeconds / 3600);
  const averageProgress =
    enrollments.length > 0
      ? Math.round(
          enrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) / enrollments.length
        )
      : 0;
  const purchasedCourseCount = new Set(purchasedItems.map((item) => item.courseId)).size;
  const hasTeamsSubscription = activeSubscription?.plan.slug === "teams";
  const subscriptionSummary = activeSubscription
    ? `${activeSubscription.status.toLowerCase().replace("_", " ")} | ${activeSubscription.billingCycle}`
    : "Upgrade anytime from pricing";

  const recentActivity = [
    ...completedLessons.map((item) => ({
      id: item.id,
      text: `Completed lesson: ${item.lesson.title}`,
      detail: item.lesson.module.course.title,
      href: `/learn/${item.lesson.module.course.slug}/${item.lessonId}`,
      date: item.updatedAt,
    })),
    ...certificates.map((certificate) => ({
      id: certificate.id,
      text: `Earned certificate: ${certificate.course.title}`,
      detail: certificate.code,
      href: "/certificates",
      date: new Date(certificate.issuedAt),
    })),
  ]
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <div className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 pt-0 sm:pt-8 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="mb-1 text-2xl font-black text-foreground sm:text-3xl">
                Welcome back, <span className="text-primary-blue">{user.name || "Learner"}</span>
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Your dashboard is now powered by live enrollment, lesson progress, certificates, and workspace notes.
              </p>
            </div>

            <Link
              href="/courses"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90"
            >
              Explore more courses <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {isSubscriptionExpired ? (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-medium text-slate-900">Your subscription has expired.</p>
              <p className="mt-1 text-sm text-slate-600">
                Your progress is saved. Renew to continue learning.
              </p>
              <Link href="/pricing?reason=expired" className="mt-2 inline-flex text-sm font-medium text-amber-700 hover:underline">
                Renew now →
              </Link>
            </div>
          ) : null}

          {showLearningPathHero ? (
            <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-6">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                    <Sparkles className="h-3.5 w-3.5" />
                    Your Learning Path
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-black text-slate-900">Your personalized path is ready</h2>
                    <ResetOnboardingButton className="text-sm font-medium text-primary-blue hover:underline">
                      Redo your learning path
                    </ResetOnboardingButton>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Based on your quiz, we recommend starting here:
                  </p>
                </div>
                <Link href="/courses" className="text-sm font-semibold text-primary-blue hover:underline">
                  View all courses
                </Link>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {recommendedCourses.map((course) => (
                  <div key={course.id} className="overflow-hidden rounded-2xl bg-white text-slate-950 shadow-lg">
                    <div className="relative h-48">
                      <Image
                        src={course.thumbnailUrl || course.imageUrl || thumbnailFallback}
                        alt={course.title}
                        fill
                        quality={75}
                        placeholder="blur"
                        blurDataURL={IMAGE_BLUR_DATA_URL}
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                        {course.category?.name} • {course.level.replace("_", " ")}
                      </p>
                      <h3 className="mt-2 text-lg font-black">{course.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                        {course.shortDescription || course.description}
                      </p>
                      <Link
                        href={`/courses/${course.slug}`}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90"
                      >
                        Start Learning <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              {
                label: "Courses Enrolled",
                value: `${enrollments.length}`,
                helper: "Active classroom access",
                icon: BookOpen,
                tone: "text-primary-blue",
              },
              {
                label: "Hours Learned",
                value: `${totalHours}h`,
                helper: "Completed lesson time",
                icon: Clock,
                tone: "text-primary-blue",
              },
              {
                label: "Certificates",
                value: `${certificates.length}`,
                helper: "Courses completed",
                icon: Award,
                tone: "text-primary-blue",
              },
              {
                label: "Average Progress",
                value: `${averageProgress}%`,
                helper: "Across enrolled courses",
                icon: TrendingUp,
                tone: "text-primary-blue",
              },
              {
                label: "Courses Purchased",
                value: `${purchasedCourseCount}`,
                helper: "Paid course checkouts",
                icon: ShoppingBag,
                tone: "text-primary-blue",
              },
              {
                label: "Subscription Plan",
                value: activeSubscription?.plan.name ?? "Free",
                helper: subscriptionSummary,
                icon: CreditCard,
                tone: "text-primary-blue",
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <stat.icon className={`mb-3 h-6 w-6 ${stat.tone}`} />
                <div className="text-2xl font-black text-foreground">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
                <div className="mt-2 text-[11px] leading-5 text-muted-foreground">{stat.helper}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {!showLearningPathHero && recommendedCourses.length > 0 ? (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-bold text-foreground">Recommended for you</h2>
                      <p className="text-xs text-muted-foreground">
                        Pick up where your onboarding path pointed you.
                      </p>
                    </div>
                    <ResetOnboardingButton className="text-sm font-medium text-primary-blue hover:underline">
                      Redo your learning path
                    </ResetOnboardingButton>
                  </div>
                  <div className="grid gap-4">
                    {recommendedCourses.map((course) => (
                      <div key={course.id} className="rounded-2xl border border-border p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div className="relative h-44 w-full overflow-hidden rounded-xl sm:h-16 sm:w-24 sm:shrink-0">
                            <Image
                              src={course.thumbnailUrl || course.imageUrl || thumbnailFallback}
                              alt={course.title}
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
                              href={`/courses/${course.slug}`}
                              className="line-clamp-1 text-sm font-bold text-foreground transition-colors hover:text-primary-blue"
                            >
                              {course.title}
                            </Link>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {course.category?.name} • {course.level.replace("_", " ")}
                            </p>
                            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                              {course.shortDescription || course.description}
                            </p>
                          </div>
                          <Link
                            href={`/courses/${course.slug}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90 sm:self-start"
                          >
                            Start Learning <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-foreground">My courses</h2>
                    <p className="text-xs text-muted-foreground">
                      Continue from your latest lesson or jump straight into the classroom.
                    </p>
                  </div>
                  <Link href="/courses" className="text-sm font-medium text-primary-blue hover:underline">
                    View catalog
                  </Link>
                </div>

                {enrollments.length === 0 ? (
                  <div className="space-y-5">
                    {!showLearningPathHero && recommendedCourses.length > 0 ? (
                      <div>
                        <div className="mb-4">
                          <h3 className="text-sm font-bold text-foreground">Recommended for you</h3>
                          <p className="text-xs text-muted-foreground">
                            Pick up where your onboarding path pointed you.
                          </p>
                        </div>
                        <div className="grid gap-4">
                          {recommendedCourses.map((course) => (
                            <div key={course.id} className="rounded-2xl border border-border p-4">
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                <div className="relative h-44 w-full overflow-hidden rounded-xl sm:h-16 sm:w-24 sm:shrink-0">
                                  <Image
                                    src={course.thumbnailUrl || course.imageUrl || thumbnailFallback}
                                    alt={course.title}
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
                                    href={`/courses/${course.slug}`}
                                    className="line-clamp-1 text-sm font-bold text-foreground transition-colors hover:text-primary-blue"
                                  >
                                    {course.title}
                                  </Link>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {course.category?.name} • {course.level.replace("_", " ")}
                                  </p>
                                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                                    {course.shortDescription || course.description}
                                  </p>
                                </div>
                                <Link
                                  href={`/courses/${course.slug}`}
                                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90 sm:self-start"
                                >
                                  Start Learning <ArrowRight className="h-4 w-4" />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                      <p className="mb-3 text-sm text-muted-foreground">
                        You haven&apos;t enrolled in any courses yet.
                      </p>
                      {recommendedCourses.length > 0 ? (
                        <div className="mb-4 text-left">
                          <p className="mb-3 text-sm font-medium text-slate-700">
                            ✨ Recommended for you based on your learning path:
                          </p>
                          <div className="grid grid-cols-1 gap-3">
                            {recommendedCourses.map((course) => (
                              <Link
                                href={`/courses/${course.slug}`}
                                key={course.id}
                                className="flex gap-3 rounded-xl border border-slate-100 p-3 text-left transition-all hover:border-blue-200 hover:bg-blue-50"
                              >
                                <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                  <Image
                                    src={course.imageUrl || course.thumbnailUrl || thumbnailFallback}
                                    alt={course.title}
                                    fill
                                    quality={75}
                                    placeholder="blur"
                                    blurDataURL={IMAGE_BLUR_DATA_URL}
                                    sizes="64px"
                                    className="object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="line-clamp-1 text-sm font-medium text-slate-900">
                                    {course.title}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {course.level.replace("_", " ")} · {course.category?.name}
                                  </p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <Link
                        href="/courses"
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90"
                      >
                        Browse all courses <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
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
                            <p className="mt-1 text-xs text-muted-foreground">
                              {enrollment.completedLessons}/{enrollment.totalLessons} lessons completed / {formatDuration(enrollment.remainingMinutes)} left
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary-blue"
                                  style={{ width: `${enrollment.progress}%` }}
                                />
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {enrollment.progress}%
                              </span>
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
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary-blue" />
                  <h2 className="text-base font-bold text-foreground">Recent activity</h2>
                </div>

                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Activity will appear here once you start completing lessons and earning certificates.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <Link
                        key={activity.id}
                        href={activity.href}
                        className="flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/40"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-blue/10 text-primary-blue">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{activity.text}</p>
                          <p className="text-xs text-muted-foreground">{activity.detail}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <ReferEarnCard />

              {hasTeamsSubscription ? (
                <div className="rounded-2xl border border-primary-blue/20 bg-primary-blue/10 p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary-blue" />
                    <h2 className="text-sm font-bold text-foreground">Teams workspace</h2>
                  </div>
                  <p className="mb-4 text-xs leading-5 text-muted-foreground">
                    {teamWorkspace
                      ? `${teamWorkspace.workspaceName} is active on your account. Manage invites, member progress, bulk course assignments, and exports from the Teams dashboard.`
                      : "Your Teams subscription is active. Open the Teams dashboard to activate your workspace, invite friends, and manage member access."}
                  </p>
                  <Link
                    href="/dashboard/teams"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90"
                  >
                    {teamWorkspace ? "Open Teams Dashboard" : "Activate Teams Dashboard"} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}

              {affiliateStatus.hasJoined ? (
                <div id="affiliate-program" className="rounded-2xl border border-primary-blue/20 bg-primary-blue/10 p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary-blue" />
                    <h2 className="text-sm font-bold text-foreground">Affiliate workspace</h2>
                  </div>
                  <p className="mb-4 text-xs leading-5 text-muted-foreground">
                    Your affiliate account is ready. Open the partner dashboard to copy your link, review payouts, and track conversions.
                  </p>
                  <Link
                    href="/affiliate/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90"
                  >
                    Open Affiliate Dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}

              <LearnerInboxPanel
                userName={user.name ?? ""}
                userEmail={user.email ?? ""}
                conversations={inboxConversations.map((conversation) => ({
                  id: conversation.id,
                  subject: conversation.subject,
                  message: conversation.message,
                  createdAt: conversation.createdAt.toISOString(),
                  replies: conversation.replies.map((reply) => ({
                    id: reply.id,
                    body: reply.body,
                    createdAt: reply.createdAt.toISOString(),
                  })),
                }))}
              />

              <WorkspaceNotesPanel notes={workspaceNotes} />

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
                  <Award className="h-4 w-4 text-amber-500" /> My certificates
                </h2>

                {certificates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Complete a course to earn your first certificate.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {certificates.slice(0, 4).map((certificate) => (
                      <div
                        key={certificate.id}
                        className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20"
                      >
                        <p className="text-xs font-semibold text-foreground">{certificate.course.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{certificate.issuedAt}</p>
                        <p className="mt-1 font-mono text-[11px] text-amber-700 dark:text-amber-400">
                          {certificate.code}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <Link
                  href="/certificates"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary-blue hover:underline"
                >
                  View all certificates <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="rounded-2xl border border-primary-blue/20 bg-primary-blue/10 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary-blue" />
                  <h2 className="text-sm font-bold text-foreground">Ask AI</h2>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  Get summaries, practice questions, and study planning help tied to your real courses.
                </p>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-xl border border-primary-blue/20 bg-white px-4 py-2.5 text-sm font-medium text-primary-blue hover:bg-primary-blue/10"
                >
                  Open a course <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
