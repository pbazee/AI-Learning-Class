import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
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
  NotebookText,
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

const thumbnailFallback =
  "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=340&fit=crop";

export default async function DashboardPage() {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const [enrollments, certificates, workspaceNotes, completedLessons, affiliateStatus, teamWorkspace, purchasedItems, activeSubscription] = await Promise.all([
    getUserEnrollments(user.id),
    getUserCertificates(user.id),
    getUserWorkspaceNotes(user.id, 8),
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
    }),
    getUserAffiliateStatus(user.id),
    getUserTeamWorkspaceSummary(user.id),
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
          },
        },
      },
      orderBy: {
        currentPeriodEnd: "desc",
      },
    }),
  ]);

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
  const subscriptionSummary = activeSubscription
    ? `${activeSubscription.status.toLowerCase().replace("_", " ")} • ${activeSubscription.billingCycle}`
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
      <Navbar />
      <div className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 pt-8 md:flex-row md:items-start md:justify-between">
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
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <p className="mb-3 text-sm text-muted-foreground">
                      You haven&apos;t enrolled in any courses yet.
                    </p>
                    <Link
                      href="/courses"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90"
                    >
                      Browse courses <ArrowRight className="h-4 w-4" />
                    </Link>
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
                              quality={100}
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

              {teamWorkspace ? (
                <div className="rounded-2xl border border-primary-blue/20 bg-primary-blue/10 p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary-blue" />
                    <h2 className="text-sm font-bold text-foreground">Teams workspace</h2>
                  </div>
                  <p className="mb-4 text-xs leading-5 text-muted-foreground">
                    {teamWorkspace.workspaceName} is active on your account. Manage invites, member progress, bulk course assignments, and exports from the Teams dashboard.
                  </p>
                  <Link
                    href="/dashboard/teams"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90"
                  >
                    Open Teams Dashboard <ArrowRight className="h-4 w-4" />
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

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div id="workspace-notes" className="mb-4 flex items-center gap-2">
                  <NotebookText className="h-4 w-4 text-primary-blue" />
                  <h2 className="text-sm font-bold text-foreground">My workspace notes</h2>
                </div>

                {workspaceNotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Saved lesson-note snapshots will appear here as you study.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {workspaceNotes.map((note) => (
                      <Link
                        key={note.id}
                        href={`/learn/${note.courseSlug}/${note.lessonId}`}
                        className="block rounded-xl border border-border p-3 transition-colors hover:border-primary-blue/20 hover:bg-primary-blue/5"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-blue">
                          {note.courseTitle}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-foreground">{note.lessonTitle}</p>
                        <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                          {note.content}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(note.timestamp))}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

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
                  <h2 className="text-sm font-bold text-foreground">AI Tutor</h2>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  Ask for summaries, practice questions, and study planning help tied to your real courses.
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
