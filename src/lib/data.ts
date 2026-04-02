import "server-only";

import { cache } from "react";
import type { BlogPost as PrismaBlogPost, Prisma } from "@prisma/client";
import type {
  Announcement,
  BlogPost,
  Category,
  Course,
  CourseAccessState,
  HeroSlide,
  SubscriptionPlan,
  Testimonial,
} from "@/types";
import {
  HOMEPAGE_PARAGRAPH_DEFAULTS,
  HOMEPAGE_PARAGRAPH_SECTIONS,
  type HomepageParagraphContentMap,
  type HomepageParagraphEntry,
  type HomepageParagraphSectionKey,
} from "@/lib/homepage-paragraphs";
import { getCompletedCourseCertificateRecords } from "@/lib/learner-records";
import { ensureLessonPreviewColumns } from "@/lib/lesson-preview";
import { isPrismaConnectionError, logPrismaConnectionEvent, prisma } from "./prisma";
import { ensureSubscriptionPlansTable, mapSubscriptionPlan } from "@/lib/subscription-plans";
import { createServerSupabaseClient } from "./supabase-server";
import { syncAuthenticatedUser } from "./auth-user-sync";

type CourseWithCategory = Prisma.CourseGetPayload<{
  include: { category: true };
}>;

type CourseWithDetails = Prisma.CourseGetPayload<{
  include: {
    category: true;
    modules: {
      include: { lessons: true };
    };
    reviews: {
      where: { isApproved: true };
      include: {
        user: {
          select: {
            name: true;
            avatarUrl: true;
          };
        };
      };
      orderBy: { createdAt: "desc" };
    };
  };
}>;

export type BlogPostRecord = BlogPost & { content: string };

export type DashboardEnrollment = {
  id: string;
  enrolledAt: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastLessonTitle?: string;
  lessonHref: string;
  actionLabel: "Continue Learning" | "Go to Classroom";
  remainingMinutes: number;
  course: Course;
};

export type UserCertificateRecord = {
  id: string;
  code: string;
  issuedAt: string;
  pdfUrl?: string;
  blockchainHash?: string;
  course: {
    id: string;
    title: string;
    slug: string;
  };
};

export type RevenuePoint = {
  month: string;
  revenue: number;
};

export type RevenueAnalyticsPoint = {
  month: string;
  revenue: number;
  mrr: number;
  freeEnrollments: number;
  paidEnrollments: number;
};

export type EnrollmentTrendPoint = {
  month: string;
  newStudents: number;
  activeLearners: number;
};

export type RevenueBreakdown = {
  freeEnrollments: number;
  paidEnrollments: number;
  freePercentage: number;
  paidPercentage: number;
};

export type CategoryBreakdown = {
  name: string;
  students: number;
  percentage: number;
};

export type RecentOrder = {
  id: string;
  student: string;
  course: string;
  amount: number;
  date: string;
  status: string;
};

export type TopCourse = {
  id?: string;
  name: string;
  thumbnailUrl?: string | null;
  categoryName?: string;
  students: number;
  revenue: number;
  rating: number;
};

export type CategoryPerformance = {
  id: string;
  name: string;
  color?: string | null;
  enrollments: number;
  completionRate: number;
  activeLearners: number;
};

export type GrowthMetric = {
  change: number;
  previousValue: number;
};

export type CountryBreakdown = {
  country: string;
  students: number;
  percentage: number;
};

export type AdminStats = {
  totalRevenue: number;
  monthlyRevenue: number;
  totalStudents: number;
  activeStudents: number;
  totalCourses: number;
  totalUsers: number;
  activePlans: number;
  avgRating: number;
  completionRate: number;
  revenueByMonth: RevenuePoint[];
  topCategories: CategoryBreakdown[];
  recentOrders: RecentOrder[];
  topCourses: TopCourse[];
  countryBreakdown: CountryBreakdown[];
  revenueAnalytics: RevenueAnalyticsPoint[];
  enrollmentTrends: EnrollmentTrendPoint[];
  revenueBreakdown: RevenueBreakdown;
  categoryPerformance: CategoryPerformance[];
  growth: {
    totalRevenue: GrowthMetric;
    monthlyRevenue: GrowthMetric;
    totalStudents: GrowthMetric;
    activeStudents: GrowthMetric;
    totalCourses: GrowthMetric;
    avgRating: GrowthMetric;
  };
};

export type LeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  country: string;
  courses: number;
  points: number;
  streak: number;
  badge: string | null;
};

export type LeaderboardStats = {
  activeLearners: string;
  coursesCompleted: string;
  avgStreak: string;
};

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
});

function formatDate(date?: Date | null) {
  return date ? fullDateFormatter.format(date) : undefined;
}

function formatShortDate(date?: Date | null) {
  return date ? shortDateFormatter.format(date) : "";
}

function stripMarkup(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_\-\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateReadTime(content: string) {
  const words = stripMarkup(content).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function formatRole(role?: string | null) {
  if (!role) return "Learner";
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatNumberCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function calculateGrowthMetric(current: number, previous: number): GrowthMetric {
  if (previous === 0) {
    return {
      change: current > 0 ? 100 : 0,
      previousValue: previous,
    };
  }

  return {
    change: Number((((current - previous) / previous) * 100).toFixed(1)),
    previousValue: previous,
  };
}

const EMPTY_ADMIN_STATS: AdminStats = {
  totalRevenue: 0,
  monthlyRevenue: 0,
  totalStudents: 0,
  activeStudents: 0,
  totalCourses: 0,
  totalUsers: 0,
  activePlans: 0,
  avgRating: 0,
  completionRate: 0,
  revenueByMonth: [],
  topCategories: [],
  recentOrders: [],
  topCourses: [],
  countryBreakdown: [],
  revenueAnalytics: [],
  enrollmentTrends: [],
  revenueBreakdown: {
    freeEnrollments: 0,
    paidEnrollments: 0,
    freePercentage: 0,
    paidPercentage: 0,
  },
  categoryPerformance: [],
  growth: {
    totalRevenue: { change: 0, previousValue: 0 },
    monthlyRevenue: { change: 0, previousValue: 0 },
    totalStudents: { change: 0, previousValue: 0 },
    activeStudents: { change: 0, previousValue: 0 },
    totalCourses: { change: 0, previousValue: 0 },
    avgRating: { change: 0, previousValue: 0 },
  },
};

const EMPTY_LEADERBOARD = {
  leaders: [] as LeaderboardEntry[],
  stats: {
    activeLearners: "0",
    coursesCompleted: "0",
    avgStreak: "0 days",
  } satisfies LeaderboardStats,
};

function resolveFallback<T>(fallback: T | (() => T)) {
  return typeof fallback === "function" ? (fallback as () => T)() : fallback;
}

async function safeDatabaseRead<T>(
  label: string,
  fallback: T | (() => T),
  query: () => Promise<T>
) {
  try {
    return await query();
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      logPrismaConnectionEvent(
        `safeDatabaseRead:${label}`,
        `[database] ${label} failed. Returning a safe fallback.`,
        error,
        "warn"
      );
      return resolveFallback(fallback);
    }

    throw error;
  }
}

function getMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function subtractMonths(date: Date, count: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - count, 1));
}

async function getInstructorMap(courseRows: Array<{ instructorId: string }>) {
  const instructorIds = Array.from(new Set(courseRows.map((course) => course.instructorId).filter(Boolean)));
  if (instructorIds.length === 0) {
    return new Map<string, { name?: string | null; avatarUrl?: string | null }>();
  }

  const instructors = await prisma.user.findMany({
    where: { id: { in: instructorIds } },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  });

  return new Map(
    instructors.map((instructor) => [
      instructor.id,
      { name: instructor.name, avatarUrl: instructor.avatarUrl },
    ])
  );
}

function mapCourse(
  course: CourseWithCategory | CourseWithDetails,
  instructorMap: Map<string, { name?: string | null; avatarUrl?: string | null }>
): Course {
  const instructor = instructorMap.get(course.instructorId);
  const baseCourse: Course = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    shortDescription: course.shortDescription ?? undefined,
    imageUrl: course.imageUrl ?? undefined,
    imagePath: course.imagePath ?? undefined,
    thumbnailUrl: course.thumbnailUrl ?? undefined,
    previewVideoUrl: course.previewVideoUrl ?? undefined,
    categoryId: course.categoryId,
    categoryName: course.category.name,
    level: course.level,
    price: course.price,
    originalPrice: course.originalPrice ?? undefined,
    currency: course.currency,
    isFree: course.isFree,
    isFeatured: course.isFeatured,
    isTrending: course.isTrending,
    isRecommended: course.isRecommended,
    isNew: course.isNew,
    totalDuration: course.totalDuration,
    totalLessons: course.totalLessons,
    totalStudents: course.totalStudents,
    rating: course.rating,
    totalRatings: course.totalRatings,
    tags: course.tags,
    whatYouLearn: course.whatYouLearn,
    requirements: course.requirements,
    instructorName: instructor?.name ?? undefined,
    instructorAvatar: instructor?.avatarUrl ?? undefined,
    language: course.language,
  };

  let mappedCourse = baseCourse;

  if ("modules" in course) {
    mappedCourse = {
      ...mappedCourse,
      modules: [...course.modules]
        .sort((left, right) => left.order - right.order)
        .map((module) => ({
          id: module.id,
          courseId: module.courseId,
          title: module.title,
          description: module.description ?? undefined,
          order: module.order,
          lessons: [...module.lessons]
            .sort((left, right) => left.order - right.order)
            .map((lesson) => ({
              id: lesson.id,
              moduleId: lesson.moduleId,
              title: lesson.title,
              description: lesson.description ?? undefined,
              type: lesson.type,
              videoUrl: lesson.videoUrl ?? lesson.assetUrl ?? undefined,
              assetUrl: lesson.assetUrl ?? lesson.videoUrl ?? undefined,
              assetPath: lesson.assetPath ?? undefined,
              duration: lesson.duration ?? undefined,
              content: lesson.content ?? undefined,
              isPreview: lesson.isPreview,
              previewPages: lesson.previewPages ?? undefined,
              previewMinutes: lesson.previewMinutes ?? undefined,
              allowDownload: lesson.allowDownload,
              sellSeparately: lesson.sellSeparately,
              order: lesson.order,
            })),
        })),
    };
  }

  if ("reviews" in course) {
    mappedCourse = {
      ...mappedCourse,
      reviews: course.reviews.map((review) => ({
        id: review.id,
        name: review.user.name || "AI Learning Class student",
        avatarUrl: review.user.avatarUrl ?? undefined,
        rating: review.rating,
        title: review.title ?? undefined,
        body: review.body,
        createdAt: formatDate(review.createdAt) || "",
      })),
    };
  }

  return mappedCourse;
}

export const getCurrentUserProfile = cache(async () => {
  return safeDatabaseRead("getCurrentUserProfile", null, async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return null;
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    return syncAuthenticatedUser(user);
  });
});

type CourseAccessComputation = CourseAccessState & {
  courseSlug: string;
  completedLessonIds: string[];
};

async function computeUserCourseAccess(userId: string, courseIds: string[]) {
  if (courseIds.length === 0) {
    return [];
  }

  const [courses, progressRows] = await Promise.all([
    prisma.course.findMany({
      where: {
        id: { in: courseIds },
        isPublished: true,
      },
      select: {
        id: true,
        slug: true,
        price: true,
        isFree: true,
        totalLessons: true,
        modules: {
          orderBy: { order: "asc" },
          select: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    }),
    prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: {
          module: {
            courseId: { in: courseIds },
          },
        },
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            module: {
              select: {
                courseId: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const progressByCourse = progressRows.reduce(
    (accumulator, row) => {
      const courseId = row.lesson.module.courseId;
      const current = accumulator.get(courseId) ?? [];
      current.push(row);
      accumulator.set(courseId, current);
      return accumulator;
    },
    new Map<string, typeof progressRows>()
  );

  return courses.map<CourseAccessComputation>((course) => {
    const orderedLessons = course.modules.flatMap((module) => module.lessons);
    const courseProgress = progressByCourse.get(course.id) ?? [];
    const completedLessonIds = new Set(
      courseProgress.filter((row) => row.isCompleted).map((row) => row.lessonId)
    );
    const completedLessons = orderedLessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
    const totalLessons = orderedLessons.length || course.totalLessons;
    const latestProgress = courseProgress[0];
    const firstIncompleteLesson =
      orderedLessons.find((lesson) => !completedLessonIds.has(lesson.id)) ?? orderedLessons[0];
    const resumeLessonId = latestProgress?.lessonId ?? firstIncompleteLesson?.id;
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      courseId: course.id,
      courseSlug: course.slug,
      hasAccess: true,
      statusLabel: course.isFree || course.price === 0 ? "Enrolled" : "Owned",
      actionLabel: latestProgress ? "Continue Learning" : "Go to Classroom",
      lessonHref: resumeLessonId ? `/learn/${course.slug}/${resumeLessonId}` : `/courses/${course.slug}`,
      progress,
      completedLessons,
      totalLessons,
      lastLessonTitle: latestProgress?.lesson.title,
      completedLessonIds: Array.from(completedLessonIds),
    };
  });
}

export async function getUserCourseAccessMap(
  userId: string,
  courseIds: string[]
): Promise<Record<string, CourseAccessState>> {
  return safeDatabaseRead("getUserCourseAccessMap", {} as Record<string, CourseAccessState>, async () => {
    if (courseIds.length === 0) {
      return {};
    }

    const now = new Date();
    const [enrollments, requestedCourses, activeSubscriptions] = await Promise.all([
      prisma.enrollment.findMany({
        where: {
          userId,
          courseId: { in: courseIds },
          status: { in: ["ACTIVE", "COMPLETED"] },
          OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
        select: {
          courseId: true,
        },
      }),
      prisma.course.findMany({
        where: {
          id: { in: courseIds },
        },
        select: {
          id: true,
          isFree: true,
          price: true,
        },
      }),
      prisma.userSubscription.findMany({
        where: {
          userId,
          status: { in: ["ACTIVE", "TRIALING"] },
          currentPeriodEnd: { gte: now },
        },
        select: {
          plan: {
            select: {
              coursesIncluded: true,
            },
          },
        },
      }),
    ]);
    const accessibleCourseIds = new Set(
      enrollments.map((enrollment) => enrollment.courseId)
    );

    if (activeSubscriptions.length > 0) {
      const coveredEntries = new Set<string>();

      activeSubscriptions.forEach((subscription) => {
        subscription.plan.coursesIncluded.forEach((entry) => {
          const normalizedEntry = entry.trim();

          if (normalizedEntry) {
            coveredEntries.add(normalizedEntry);
          }
        });
      });

      if (coveredEntries.has("ALL")) {
        courseIds.forEach((courseId) => accessibleCourseIds.add(courseId));
      } else {
        const includesFreeCourses = coveredEntries.has("FREE");

        requestedCourses.forEach((course) => {
          if (coveredEntries.has(course.id)) {
            accessibleCourseIds.add(course.id);
            return;
          }

          if (includesFreeCourses && (course.isFree || course.price === 0)) {
            accessibleCourseIds.add(course.id);
          }
        });
      }
    }

    if (accessibleCourseIds.size === 0) {
      return {};
    }

    const accessRows = await computeUserCourseAccess(
      userId,
      Array.from(accessibleCourseIds)
    );

    return accessRows.reduce<Record<string, CourseAccessState>>((accumulator, row) => {
      accumulator[row.courseId] = {
        courseId: row.courseId,
        hasAccess: row.hasAccess,
        statusLabel: row.statusLabel,
        actionLabel: row.actionLabel,
        lessonHref: row.lessonHref,
        progress: row.progress,
        completedLessons: row.completedLessons,
        totalLessons: row.totalLessons,
        lastLessonTitle: row.lastLessonTitle,
      };
      return accumulator;
    }, {});
  });
}

export async function getUserAffiliateStatus(userId: string) {
  return safeDatabaseRead(
    "getUserAffiliateStatus",
    { hasJoined: false, status: null as string | null },
    async () => {
      const affiliate = await prisma.affiliate.findUnique({
        where: { userId },
        select: {
          id: true,
          status: true,
        },
      });

      return {
        hasJoined: Boolean(affiliate),
        status: affiliate?.status ?? null,
      };
    }
  );
}

export async function getCourses(filters?: {
  categorySlug?: string;
  level?: string;
  isFree?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  search?: string;
  sort?: string;
  limit?: number;
}): Promise<Course[]> {
  return safeDatabaseRead("getCourses", [] as Course[], async () => {
    const where: Prisma.CourseWhereInput = {
      isPublished: true,
    };

    if (filters?.categorySlug && filters.categorySlug !== "all") {
      where.category = { slug: filters.categorySlug };
    }

    if (filters?.level && filters.level !== "ALL") {
      where.level = filters.level as Course["level"];
    }

    if (filters?.isFree !== undefined) {
      where.isFree = filters.isFree;
    }

    if (filters?.isFeatured) {
      where.isFeatured = true;
    }

    if (filters?.isTrending) {
      where.isTrending = true;
    }

    if (filters?.isNew) {
      where.isNew = true;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { shortDescription: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    let orderBy: Prisma.CourseOrderByWithRelationInput[] = [
      { isFeatured: "desc" },
      { createdAt: "desc" },
    ];

    switch (filters?.sort) {
      case "popular":
        orderBy = [{ totalStudents: "desc" }, { rating: "desc" }];
        break;
      case "rating":
        orderBy = [{ rating: "desc" }, { totalRatings: "desc" }];
        break;
      case "newest":
        orderBy = [{ createdAt: "desc" }];
        break;
      case "price-low":
        orderBy = [{ price: "asc" }];
        break;
      case "price-high":
        orderBy = [{ price: "desc" }];
        break;
    }

    const courses = await prisma.course.findMany({
      where,
      include: { category: true },
      orderBy,
      take: filters?.limit,
    });

    const instructorMap = await getInstructorMap(courses);
    let mappedCourses = courses.map((course) => mapCourse(course, instructorMap));

    if (filters?.search) {
      const query = filters.search.toLowerCase();
      mappedCourses = mappedCourses.filter(
        (course) =>
          course.title.toLowerCase().includes(query) ||
          course.description.toLowerCase().includes(query) ||
          course.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return mappedCourses;
  });
}

export async function getHomepageParagraphEntries(): Promise<HomepageParagraphEntry[]> {
  return safeDatabaseRead(
    "getHomepageParagraphEntries",
    HOMEPAGE_PARAGRAPH_SECTIONS.map((section) => ({
      id: null,
      sectionKey: section.sectionKey,
      sectionName: section.sectionName,
      defaultContent: section.defaultContent,
      content: section.defaultContent,
      updatedAt: null,
      isDefault: true,
    })),
    async () => {
      const paragraphs = await prisma.homepageParagraph.findMany({
        orderBy: { updatedAt: "desc" },
      });

      const paragraphMap = new Map(
        paragraphs.map((paragraph) => [
          paragraph.sectionKey as HomepageParagraphSectionKey,
          paragraph,
        ])
      );

      return HOMEPAGE_PARAGRAPH_SECTIONS.map((section) => {
        const paragraph = paragraphMap.get(section.sectionKey);

        return {
          id: paragraph?.id ?? null,
          sectionKey: section.sectionKey,
          sectionName: section.sectionName,
          defaultContent: section.defaultContent,
          content: paragraph?.content ?? section.defaultContent,
          updatedAt: paragraph?.updatedAt.toISOString() ?? null,
          isDefault: !paragraph,
        };
      });
    }
  );
}

export async function getHomepageParagraphContentMap(): Promise<HomepageParagraphContentMap> {
  const paragraphs = await getHomepageParagraphEntries();

  return paragraphs.reduce(
    (accumulator, paragraph) => {
      accumulator[paragraph.sectionKey] = paragraph.content;
      return accumulator;
    },
    { ...HOMEPAGE_PARAGRAPH_DEFAULTS }
  );
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  return safeDatabaseRead("getCourseBySlug", null, async () => {
    await ensureLessonPreviewColumns();

    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        category: true,
        modules: {
          include: {
            lessons: true,
          },
        },
        reviews: {
          where: { isApproved: true },
          include: {
            user: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!course || !course.isPublished) {
      return null;
    }

    const instructorMap = await getInstructorMap([course]);
    return mapCourse(course, instructorMap);
  });
}

export async function getCourseByLessonId(lessonId: string): Promise<Course | null> {
  return safeDatabaseRead("getCourseByLessonId", null, async () => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        module: {
          select: {
            course: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });

    const courseSlug = lesson?.module.course.slug;

    if (!courseSlug) {
      return null;
    }

    return getCourseBySlug(courseSlug);
  });
}

export async function getCategories(): Promise<Category[]> {
  return safeDatabaseRead("getCategories", [] as Category[], async () => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      imageUrl: category.imageUrl ?? undefined,
      imagePath: category.imagePath ?? undefined,
      icon: category.icon ?? undefined,
      color: category.color ?? undefined,
      isActive: category.isActive,
      parentId: category.parentId ?? undefined,
    }));
  });
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  return safeDatabaseRead("getHeroSlides", [] as HeroSlide[], async () => {
    const slides = await prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return slides.map((slide) => ({
      id: slide.id,
      title: slide.title,
      subtitle: slide.subtitle ?? undefined,
      description: slide.description ?? undefined,
      imageUrl: slide.imageUrl,
      ctaText: slide.ctaText ?? undefined,
      ctaLink: slide.ctaLink ?? undefined,
      isActive: slide.isActive,
      order: slide.order,
      autoSlideInterval: slide.autoSlideInterval ?? undefined,
    }));
  });
}

export async function getAnnouncements(): Promise<Announcement[]> {
  return safeDatabaseRead("getAnnouncements", [] as Announcement[], async () => {
    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        AND: [
          {
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          },
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return announcements.map((announcement) => ({
      id: announcement.id,
      text: announcement.text,
      link: announcement.link ?? undefined,
      linkText: announcement.linkText ?? undefined,
      bgColor: announcement.bgColor ?? undefined,
      isActive: announcement.isActive,
    }));
  });
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return safeDatabaseRead("getSubscriptionPlans", [] as SubscriptionPlan[], async () => {
    await ensureSubscriptionPlansTable();

    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ price: "asc" }, { createdAt: "asc" }],
    });

    return plans.map(mapSubscriptionPlan);
  });
}

async function getBlogAuthorMap(authorIds: string[]) {
  const uniqueAuthorIds = Array.from(new Set(authorIds.filter(Boolean)));
  if (uniqueAuthorIds.length === 0) {
    return new Map<string, string>();
  }

  const authors = await prisma.user.findMany({
    where: { id: { in: uniqueAuthorIds } },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return new Map(
    authors.map((author) => [author.id, author.name || author.email || "AI Learning Class"])
  );
}

function mapBlogPost(
  post: PrismaBlogPost & { category?: { name: string } | null; status?: string },
  authorMap: Map<string, string>
): BlogPostRecord {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? undefined,
    content: post.content,
    coverImage: post.coverImage ?? undefined,
    categoryName: post.category?.name ?? undefined,
    status: (post.status as BlogPost["status"]) ?? undefined,
    authorName: authorMap.get(post.authorId) ?? "AI Learning Class",
    tags: post.tags,
    publishedAt: formatDate(post.publishedAt ?? post.createdAt),
    readTime: estimateReadTime(post.content),
  };
}

export async function getBlogPosts(limit?: number): Promise<BlogPostRecord[]> {
  return safeDatabaseRead("getBlogPosts", [] as BlogPostRecord[], async () => {
    const posts = await prisma.blogPost.findMany({
      where: {
        OR: [{ status: "PUBLISHED" }, { isPublished: true }],
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    const authorMap = await getBlogAuthorMap(posts.map((post) => post.authorId));
    return posts.map((post) => mapBlogPost(post, authorMap));
  });
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostRecord | null> {
  return safeDatabaseRead("getBlogPostBySlug", null, async () => {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!post || (!post.isPublished && post.status !== "PUBLISHED")) {
      return null;
    }

    const authorMap = await getBlogAuthorMap([post.authorId]);
    return mapBlogPost(post, authorMap);
  });
}

export async function getTestimonials(limit = 4): Promise<Testimonial[]> {
  return safeDatabaseRead("getTestimonials", [] as Testimonial[], async () => {
    const reviews = await prisma.review.findMany({
      where: { isApproved: true },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
            country: true,
            role: true,
          },
        },
        course: {
          select: {
            title: true,
          },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return reviews.map((review) => ({
      id: review.id,
      name: review.user.name || "AI Learning Class student",
      role: formatRole(review.user.role),
      avatar: review.user.avatarUrl ?? undefined,
      rating: review.rating,
      text: review.body,
      courseCompleted: review.course.title,
      country: review.user.country ?? undefined,
    }));
  });
}

export async function getAdminStats(): Promise<AdminStats> {
  return safeDatabaseRead("getAdminStats", EMPTY_ADMIN_STATS, async () => {
    await ensureSubscriptionPlansTable();

    const now = new Date();
    const thisMonthStart = getMonthStart(now);

    const [
      totalUsers,
      activePlans,
      studentRows,
      revenueOrders,
      enrollmentRows,
      subscriptionRows,
      publishedCourses,
      reviewRows,
      recentOrders,
      orderItems,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.subscriptionPlan.count({
        where: { isActive: true },
      }),
      prisma.user.findMany({
        where: { role: "STUDENT" },
        select: {
          createdAt: true,
          country: true,
        },
      }),
      prisma.order.findMany({
        where: { status: "COMPLETED" },
        select: {
          totalAmount: true,
          createdAt: true,
        },
      }),
      prisma.enrollment.findMany({
        select: {
          userId: true,
          status: true,
          enrolledAt: true,
          completedAt: true,
          course: {
            select: {
              isFree: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      }),
      prisma.userSubscription.findMany({
        where: {
          status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
        },
        select: {
          billingCycle: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          status: true,
          plan: {
            select: {
              price: true,
              yearlyPrice: true,
            },
          },
        },
      }),
      prisma.course.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          createdAt: true,
          rating: true,
        },
      }),
      prisma.review.findMany({
        select: {
          rating: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              course: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            status: "COMPLETED",
          },
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              totalStudents: true,
              rating: true,
              thumbnailUrl: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const timeline = Array.from({ length: 6 }, (_, index) => {
      const monthStart = subtractMonths(thisMonthStart, 5 - index);
      const nextMonthStart = index === 5 ? now : subtractMonths(thisMonthStart, 4 - index);
      const monthKey = getMonthKey(monthStart);

      const monthlyRevenueValue = revenueOrders
        .filter((order) => getMonthKey(order.createdAt) === monthKey)
        .reduce((sum, order) => sum + order.totalAmount, 0);

      const monthlyNewStudents = studentRows.filter(
        (student) => getMonthKey(student.createdAt) === monthKey
      ).length;

      const activeLearners = new Set(
        enrollmentRows
          .filter((enrollment) => {
            const overlapsMonth =
              enrollment.enrolledAt < nextMonthStart &&
              (!enrollment.completedAt || enrollment.completedAt >= monthStart);

            return overlapsMonth && ["ACTIVE", "COMPLETED"].includes(enrollment.status);
          })
          .map((enrollment) => enrollment.userId)
      ).size;

      const freeEnrollments = enrollmentRows.filter(
        (enrollment) =>
          getMonthKey(enrollment.enrolledAt) === monthKey && enrollment.course.isFree
      ).length;

      const paidEnrollments = enrollmentRows.filter(
        (enrollment) =>
          getMonthKey(enrollment.enrolledAt) === monthKey && !enrollment.course.isFree
      ).length;

      const mrr = subscriptionRows
        .filter(
          (subscription) =>
            subscription.currentPeriodStart < nextMonthStart &&
            subscription.currentPeriodEnd >= monthStart
        )
        .reduce((sum, subscription) => {
          const monthlyEquivalent =
            subscription.billingCycle.toLowerCase() === "yearly"
              ? (subscription.plan.yearlyPrice ?? subscription.plan.price) / 12
              : subscription.plan.price;

          return sum + monthlyEquivalent;
        }, 0);

      return {
        month: monthFormatter.format(monthStart),
        revenue: monthlyRevenueValue,
        mrr: Number(mrr.toFixed(2)),
        freeEnrollments,
        paidEnrollments,
        newStudents: monthlyNewStudents,
        activeLearners,
      };
    });

    const totalRevenueValue = revenueOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const monthlyRevenueValue = timeline.at(-1)?.revenue ?? 0;
    const previousMonthlyRevenue = timeline.at(-2)?.revenue ?? 0;
    const totalStudents = studentRows.length;
    const previousTotalStudents = studentRows.filter((student) => student.createdAt < thisMonthStart).length;
    const activeStudents = timeline.at(-1)?.activeLearners ?? 0;
    const previousActiveStudents = timeline.at(-2)?.activeLearners ?? 0;
    const totalCourses = publishedCourses.length;
    const previousTotalCourses = publishedCourses.filter((course) => course.createdAt < thisMonthStart).length;
    const avgRatingCurrent =
      reviewRows.length > 0
        ? Number(
            (
              reviewRows.reduce((sum, review) => sum + review.rating, 0) / reviewRows.length
            ).toFixed(1)
          )
        : Number(
            (
              publishedCourses.reduce((sum, course) => sum + course.rating, 0) /
              Math.max(publishedCourses.length, 1)
            ).toFixed(1)
          );
    const previousReviewRows = reviewRows.filter((review) => review.createdAt < thisMonthStart);
    const avgRatingPrevious =
      previousReviewRows.length > 0
        ? Number(
            (
              previousReviewRows.reduce((sum, review) => sum + review.rating, 0) /
              previousReviewRows.length
            ).toFixed(1)
          )
        : 0;

    const categoryStats = enrollmentRows.reduce(
      (accumulator, enrollment) => {
        const category = enrollment.course.category;
        const entry = accumulator.get(category.id) ?? {
          id: category.id,
          name: category.name,
          color: category.color,
          enrollments: 0,
          completed: 0,
          activeLearners: new Set<string>(),
        };

        entry.enrollments += 1;
        if (enrollment.status === "COMPLETED") {
          entry.completed += 1;
        }

        const overlapsCurrentMonth =
          enrollment.enrolledAt < now &&
          (!enrollment.completedAt || enrollment.completedAt >= thisMonthStart) &&
          ["ACTIVE", "COMPLETED"].includes(enrollment.status);

        if (overlapsCurrentMonth) {
          entry.activeLearners.add(enrollment.userId);
        }

        accumulator.set(category.id, entry);
        return accumulator;
      },
      new Map<
        string,
        {
          id: string;
          name: string;
          color?: string | null;
          enrollments: number;
          completed: number;
          activeLearners: Set<string>;
        }
      >()
    );

    const categoryPerformance = Array.from(categoryStats.values())
      .map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        enrollments: category.enrollments,
        completionRate:
          category.enrollments > 0
            ? Math.round((category.completed / category.enrollments) * 100)
            : 0,
        activeLearners: category.activeLearners.size,
      }))
      .sort((left, right) => right.enrollments - left.enrollments);

    const totalCategoryStudents = categoryPerformance.reduce(
      (sum, category) => sum + category.enrollments,
      0
    );
    const topCategories = categoryPerformance.slice(0, 4).map((category) => ({
      name: category.name,
      students: category.enrollments,
      percentage:
        totalCategoryStudents > 0
          ? Math.round((category.enrollments / totalCategoryStudents) * 100)
          : 0,
    }));

    const recentOrderRows = recentOrders.map((order) => ({
      id: order.id,
      student: order.user.name || order.user.email || "Unknown learner",
      course:
        order.items
          .map((item) => item.course.title)
          .filter(Boolean)
          .join(", ") || "No course items",
      amount: order.totalAmount,
      date: formatShortDate(order.createdAt),
      status: order.status,
    }));

    const courseRevenueMap = orderItems.reduce(
      (accumulator, item) => {
        const existing = accumulator.get(item.course.id) ?? {
          id: item.course.id,
          name: item.course.title,
          thumbnailUrl: item.course.thumbnailUrl,
          categoryName: item.course.category.name,
          students: item.course.totalStudents,
          revenue: 0,
          rating: item.course.rating,
        };

        existing.revenue += item.price;
        accumulator.set(item.course.id, existing);
        return accumulator;
      },
      new Map<string, TopCourse>()
    );

    const topCourses = Array.from(courseRevenueMap.values())
      .sort((left, right) => {
        if (right.students !== left.students) {
          return right.students - left.students;
        }

        return right.revenue - left.revenue;
      })
      .slice(0, 5);

    const countryTotals = studentRows.reduce(
      (accumulator, student) => {
        const country = student.country?.trim() || "Unknown";
        accumulator.set(country, (accumulator.get(country) ?? 0) + 1);
        return accumulator;
      },
      new Map<string, number>()
    );

    const totalCountryRows = Array.from(countryTotals.values()).reduce((sum, value) => sum + value, 0);
    const countryBreakdown = Array.from(countryTotals.entries())
      .map(([country, students]) => ({
        country,
        students,
        percentage: totalCountryRows > 0 ? Math.round((students / totalCountryRows) * 100) : 0,
      }))
      .sort((left, right) => right.students - left.students)
      .slice(0, 8);

    const totalEnrollments = enrollmentRows.length;
    const completedEnrollments = enrollmentRows.filter(
      (enrollment) => enrollment.status === "COMPLETED"
    ).length;
    const freeEnrollments = enrollmentRows.filter((enrollment) => enrollment.course.isFree).length;
    const paidEnrollments = totalEnrollments - freeEnrollments;

    return {
      totalRevenue: Number(totalRevenueValue.toFixed(2)),
      monthlyRevenue: Number(monthlyRevenueValue.toFixed(2)),
      totalStudents,
      activeStudents,
      totalCourses,
      totalUsers,
      activePlans,
      avgRating: avgRatingCurrent,
      completionRate:
        totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
      revenueByMonth: timeline.map((point) => ({
        month: point.month,
        revenue: Number(point.revenue.toFixed(2)),
      })),
      revenueAnalytics: timeline.map((point) => ({
        month: point.month,
        revenue: Number(point.revenue.toFixed(2)),
        mrr: point.mrr,
        freeEnrollments: point.freeEnrollments,
        paidEnrollments: point.paidEnrollments,
      })),
      enrollmentTrends: timeline.map((point) => ({
        month: point.month,
        newStudents: point.newStudents,
        activeLearners: point.activeLearners,
      })),
      revenueBreakdown: {
        freeEnrollments,
        paidEnrollments,
        freePercentage: totalEnrollments > 0 ? Math.round((freeEnrollments / totalEnrollments) * 100) : 0,
        paidPercentage: totalEnrollments > 0 ? Math.round((paidEnrollments / totalEnrollments) * 100) : 0,
      },
      topCategories,
      recentOrders: recentOrderRows,
      topCourses,
      categoryPerformance,
      countryBreakdown,
      growth: {
        totalRevenue: calculateGrowthMetric(
          totalRevenueValue,
          revenueOrders
            .filter((order) => order.createdAt < thisMonthStart)
            .reduce((sum, order) => sum + order.totalAmount, 0)
        ),
        monthlyRevenue: calculateGrowthMetric(monthlyRevenueValue, previousMonthlyRevenue),
        totalStudents: calculateGrowthMetric(totalStudents, previousTotalStudents),
        activeStudents: calculateGrowthMetric(activeStudents, previousActiveStudents),
        totalCourses: calculateGrowthMetric(totalCourses, previousTotalCourses),
        avgRating: calculateGrowthMetric(avgRatingCurrent, avgRatingPrevious),
      },
    };
  });
}

export async function getUserEnrollments(userId: string): Promise<DashboardEnrollment[]> {
  return safeDatabaseRead("getUserEnrollments", [] as DashboardEnrollment[], async () => {
    await ensureLessonPreviewColumns();
    const now = new Date();

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "COMPLETED"] },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      include: {
        course: {
          include: {
            category: true,
            modules: {
              include: {
                lessons: true,
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    if (enrollments.length === 0) {
      return [];
    }

    const courseIds = enrollments.map((enrollment) => enrollment.courseId);
    const [accessRows, instructorMap] = await Promise.all([
      computeUserCourseAccess(userId, courseIds),
      getInstructorMap(enrollments.map((enrollment) => enrollment.course)),
    ]);
    const accessByCourse = new Map(accessRows.map((row) => [row.courseId, row]));

    return enrollments.map((enrollment) => {
      const courseAccess = accessByCourse.get(enrollment.courseId);
      const totalLessons =
        courseAccess?.totalLessons ||
        enrollment.course.modules.reduce((sum, module) => sum + module.lessons.length, 0) ||
        enrollment.course.totalLessons;
      const completedLessons = courseAccess?.completedLessons ?? 0;
      const totalDurationSeconds = enrollment.course.modules.reduce(
        (sum, module) =>
          sum +
          module.lessons.reduce((lessonSum, lesson) => lessonSum + (lesson.duration ?? 0), 0),
        0
      );
      const orderedLessons = enrollment.course.modules.flatMap((module) => module.lessons);
      const completedLessonIds = new Set(courseAccess?.completedLessonIds ?? []);
      const completedDurationSeconds = orderedLessons.reduce((sum, lesson) => {
        if (completedLessonIds.has(lesson.id)) {
          return sum + (lesson.duration ?? 0);
        }

        return sum;
      }, 0);
      const remainingMinutes = Math.max(
        0,
        Math.ceil((totalDurationSeconds - completedDurationSeconds) / 60)
      );

      return {
        id: enrollment.id,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        progress: courseAccess?.progress ?? (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0),
        completedLessons,
        totalLessons,
        lastLessonTitle: courseAccess?.lastLessonTitle,
        lessonHref: courseAccess?.lessonHref ?? `/courses/${enrollment.course.slug}`,
        actionLabel: courseAccess?.actionLabel ?? "Go to Classroom",
        remainingMinutes,
        course: mapCourse(enrollment.course, instructorMap),
      };
    });
  });
}

export async function getUserCertificates(userId: string): Promise<UserCertificateRecord[]> {
  return safeDatabaseRead("getUserCertificates", [] as UserCertificateRecord[], async () => {
    const certificates = await getCompletedCourseCertificateRecords(userId);

    return certificates.map((certificate) => ({
      id: certificate.id,
      code: certificate.code,
      issuedAt: certificate.issuedAt,
      pdfUrl: certificate.pdfUrl,
      blockchainHash: certificate.blockchainHash,
      course: certificate.course,
    }));
  });
}

function calculateStreak(dates: Date[]) {
  const uniqueDates = Array.from(
    new Set(
      dates
        .map((date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString())
    )
  )
    .map((value) => new Date(value))
    .sort((left, right) => right.getTime() - left.getTime());

  if (uniqueDates.length === 0) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = uniqueDates[index - 1];
    const current = uniqueDates[index];
    const difference = previous.getTime() - current.getTime();
    if (difference !== 24 * 60 * 60 * 1000) {
      break;
    }
    streak += 1;
  }

  return streak;
}

export async function getLeaderboard(limit = 10) {
  return safeDatabaseRead("getLeaderboard", EMPTY_LEADERBOARD, async () => {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { enrollments: { some: {} } },
          { progress: { some: { isCompleted: true } } },
          { certificates: { some: {} } },
        ],
      },
      include: {
        enrollments: {
          select: {
            status: true,
          },
        },
        progress: {
          where: { isCompleted: true },
          select: {
            completedAt: true,
            updatedAt: true,
          },
        },
        certificates: {
          select: {
            id: true,
          },
        },
      },
    });

    const entries = users
      .map((user) => {
        const completedCourses = user.enrollments.filter((enrollment) => enrollment.status === "COMPLETED").length;
        const completedLessons = user.progress.length;
        const streak = calculateStreak(
          user.progress.map((row) => row.completedAt ?? row.updatedAt)
        );
        const points = completedLessons * 40 + completedCourses * 300 + user.certificates.length * 500;

        return {
          id: user.id,
          name: user.name || user.email,
          country: user.country || "Global",
          courses: completedCourses,
          points,
          streak,
        };
      })
      .filter((entry) => entry.points > 0)
      .sort((left, right) => right.points - left.points)
      .slice(0, limit)
      .map((entry, index) => ({
        rank: index + 1,
        badge: index === 0 ? "Trophy" : index === 1 ? "Silver" : index === 2 ? "Bronze" : null,
        ...entry,
      }));

    const averageStreak =
      entries.length > 0
        ? Math.round(entries.reduce((sum, entry) => sum + entry.streak, 0) / entries.length)
        : 0;

    return {
      leaders: entries,
      stats: {
        activeLearners: formatNumberCompact(users.length),
        coursesCompleted: formatNumberCompact(
          users.reduce(
            (sum, user) =>
              sum + user.enrollments.filter((enrollment) => enrollment.status === "COMPLETED").length,
            0
          )
        ),
        avgStreak: `${averageStreak} days`,
      } satisfies LeaderboardStats,
    };
  });
}
