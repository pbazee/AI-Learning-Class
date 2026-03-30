import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Award,
  BookOpen,
  Clock,
  Play,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { getCurrentUserProfile, getUserCertificates, getUserEnrollments } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/utils";

const thumbnailFallback =
  "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=340&fit=crop";

export default async function DashboardPage() {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const [enrollments, certificates, completedLessons] = await Promise.all([
    getUserEnrollments(user.id),
    getUserCertificates(user.id),
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
      <div className="pt-20 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 pt-8 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="mb-1 text-2xl font-black text-foreground">
                Welcome back, <span className="text-blue-600">{user.name || "Learner"}</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Your dashboard is now powered by live enrollment, lesson progress, and certificate data.
              </p>
            </div>

            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Explore more courses <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Courses Enrolled", value: `${enrollments.length}`, icon: BookOpen, tone: "text-blue-600 dark:text-blue-400" },
              { label: "Hours Learned", value: `${totalHours}h`, icon: Clock, tone: "text-violet-600 dark:text-violet-400" },
              { label: "Certificates", value: `${certificates.length}`, icon: Award, tone: "text-amber-600 dark:text-amber-400" },
              { label: "Average Progress", value: `${averageProgress}%`, icon: TrendingUp, tone: "text-emerald-600 dark:text-emerald-400" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <stat.icon className={`mb-3 h-6 w-6 ${stat.tone}`} />
                <div className="text-2xl font-black text-foreground">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-foreground">My courses</h2>
                    <p className="text-xs text-muted-foreground">
                      Real progress pulled from your current enrollment records.
                    </p>
                  </div>
                  <Link href="/courses" className="text-sm font-medium text-blue-600 hover:underline">
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
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Browse courses <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="rounded-2xl border border-border p-5">
                        <div className="flex items-start gap-4">
                          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl">
                            <Image
                              src={enrollment.course.thumbnailUrl || thumbnailFallback}
                              alt={enrollment.course.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/courses/${enrollment.course.slug}`}
                              className="line-clamp-1 text-sm font-bold text-foreground transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {enrollment.course.title}
                            </Link>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {enrollment.lastLessonTitle
                                ? `Latest progress: ${enrollment.lastLessonTitle}`
                                : "No completed lessons yet"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {enrollment.completedLessons}/{enrollment.totalLessons} lessons completed ·{" "}
                              {formatDuration(enrollment.remainingMinutes)} left
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-blue-600"
                                  style={{ width: `${enrollment.progress}%` }}
                                />
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {enrollment.progress}%
                              </span>
                            </div>
                          </div>
                          <Link
                            href={`/courses/${enrollment.course.slug}`}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-950/60"
                          >
                            <Play className="ml-0.5 h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
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
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                >
                  View all certificates <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950/20">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <h2 className="text-sm font-bold text-foreground">AI Tutor</h2>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  Ask for summaries, practice questions, and study planning help tied to your real courses.
                </p>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/60"
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
