"use server";

import {
  Prisma,
  type ContentStatus,
  type CouponDiscountType,
  type CourseAssetType,
  type LessonType,
  type Level,
  type PopupShowOn,
  type Role,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeEmail } from "@/lib/admin-email";
import { syncCourseReviewMetrics } from "@/lib/course-reviews";
import { HOMEPAGE_PARAGRAPH_SECTION_KEYS } from "@/lib/homepage-paragraphs";
import { isPrismaConnectionError, prisma } from "@/lib/prisma";
import { deleteAdminStorageObjects } from "@/lib/supabase-admin";

type ActionResult<T = void> = {
  success: boolean;
  message: string;
  data?: T;
};

const levelOptions = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"] as const;
const roleOptions = ["STUDENT", "INSTRUCTOR", "ADMIN", "SUPER_ADMIN"] as const;
const blogStatusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const couponDiscountOptions = ["PERCENTAGE", "FIXED_AMOUNT"] as const;
const courseAssetTypeOptions = ["AUDIO", "VIDEO", "PDF"] as const;
const lessonTypeOptions = ["VIDEO", "AUDIO", "PDF", "TEXT", "QUIZ", "ASSIGNMENT", "PROJECT", "LIVE"] as const;
const popupShowOnOptions = ["HOMEPAGE_ONLY", "COURSE_PAGES", "BLOG_PAGES", "ALL_PAGES"] as const;

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Category name is required."),
  slug: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  imagePath: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  parentId: z.string().optional().nullable(),
});

const userSchema = z.object({
  id: z.string().optional(),
  email: z.string().email("A valid email is required."),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
  bio: z.string().optional(),
  country: z.string().optional(),
  role: z.enum(roleOptions),
});

const userRoleUpdateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"]),
});

const lessonSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Lesson title is required."),
  description: z.string().optional(),
  type: z.enum(lessonTypeOptions),
  assetUrl: z.string().optional(),
  assetPath: z.string().optional(),
  duration: z.coerce.number().min(0).optional(),
  content: z.string().optional(),
  isPreview: z.boolean().optional().default(false),
  allowDownload: z.boolean().optional().default(false),
  sellSeparately: z.boolean().optional().default(false),
  order: z.coerce.number().min(0).optional().default(0),
});

const sectionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Section title is required."),
  description: z.string().optional(),
  order: z.coerce.number().min(0).optional().default(0),
  lessons: z.array(lessonSchema).optional().default([]),
});

const courseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Course title is required."),
  slug: z.string().optional(),
  description: z.string().min(10, "Course description is required."),
  shortDescription: z.string().optional(),
  imageUrl: z.string().optional(),
  imagePath: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  thumbnailPath: z.string().optional(),
  categoryId: z.string().min(1, "Select a category."),
  instructorId: z.string().min(1, "Select an instructor."),
  level: z.enum(levelOptions),
  language: z.string().optional(),
  price: z.coerce.number().min(0),
  originalPrice: z.coerce.number().min(0).optional(),
  status: z.enum(["PUBLISHED", "DRAFT"]),
  isFeatured: z.boolean().optional().default(false),
  isTrending: z.boolean().optional().default(false),
  isRecommended: z.boolean().optional().default(false),
  isFree: z.boolean().optional().default(false),
  isNew: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
  whatYouLearn: z.array(z.string()).optional().default([]),
  requirements: z.array(z.string()).optional().default([]),
  curriculum: z.array(sectionSchema).optional(),
});

const bulkImportCourseSchema = z.object({
  title: z.string().min(3, "Course title is required."),
  slug: z.string().optional(),
  description: z.string().min(10, "Course description is required."),
  shortDescription: z.string().optional(),
  category: z.string().min(1, "Category is required."),
  price: z.coerce.number().min(0).optional().default(0),
  level: z.enum(levelOptions).optional().default("BEGINNER"),
  language: z.string().optional(),
  status: z.enum(["PUBLISHED", "DRAFT"]).optional().default("DRAFT"),
  isFeatured: z.boolean().optional().default(false),
  isTrending: z.boolean().optional().default(false),
  isRecommended: z.boolean().optional().default(false),
  isFree: z.boolean().optional().default(false),
  isNew: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional().default([]),
  whatYouLearn: z.array(z.string()).optional().default([]),
  requirements: z.array(z.string()).optional().default([]),
});

const bulkImportCoursesSchema = z.object({
  defaultInstructorId: z.string().min(1, "Select a default instructor."),
  courses: z.array(bulkImportCourseSchema).min(1, "Add at least one course to import."),
});

const courseAssetSchema = z.object({
  id: z.string().optional(),
  courseId: z.string().min(1),
  type: z.enum(courseAssetTypeOptions),
  title: z.string().min(2, "Asset title is required."),
  fileName: z.string().min(1),
  storagePath: z.string().min(1),
  url: z.string().url(),
  mimeType: z.string().optional(),
  sizeBytes: z.coerce.number().optional(),
  order: z.coerce.number().min(0).optional().default(0),
});

const blogSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Blog title is required."),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().min(10, "Blog content is required."),
  coverImage: z.string().optional(),
  coverImagePath: z.string().optional(),
  authorId: z.string().min(1, "Select an author."),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(blogStatusOptions),
});

const planSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Plan name is required."),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  yearlyPrice: z.coerce.number().min(0).optional(),
  currency: z.string().min(3).default("USD"),
  features: z.array(z.string()).optional().default([]),
  coursesIncluded: z.array(z.string()).optional().default([]),
  isPopular: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

const announcementSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(3, "Announcement text is required."),
  link: z.string().optional(),
  linkText: z.string().optional(),
  bgColor: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const heroSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Slide title is required."),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().min(1, "Hero image is required."),
  imagePath: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  order: z.coerce.number().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  autoSlideInterval: z.coerce.number().positive().optional().nullable(),
});

const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(2, "Coupon code is required."),
  description: z.string().optional(),
  discountType: z.enum(couponDiscountOptions),
  value: z.coerce.number().min(0),
  expiresAt: z.string().optional(),
  usageLimit: z.coerce.number().min(1).optional(),
  isActive: z.boolean().optional().default(true),
});

const reviewSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, "Select a learner."),
  courseId: z.string().min(1, "Select a course."),
  rating: z.coerce.number().min(1).max(5),
  title: z.string().optional(),
  body: z.string().min(3, "Review text is required."),
  isApproved: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
});

const popupSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Popup title is required."),
  content: z.string().min(3, "Popup content is required."),
  imageUrl: z.string().optional(),
  imagePath: z.string().optional(),
  buttonText: z.string().optional(),
  link: z.string().optional(),
  showOn: z.enum(popupShowOnOptions).optional().default("HOMEPAGE_ONLY"),
  delaySeconds: z.coerce.number().min(0).max(3600).optional().default(4),
  isActive: z.boolean().optional().default(false),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  triggerRules: z.union([z.string(), z.record(z.any())]).optional(),
});

const faqSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(3, "Question is required."),
  answer: z.string().min(3, "Answer is required."),
  sortOrder: z.coerce.number().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const settingsSchema = z.object({
  siteName: z.string().min(2, "Site name is required."),
  supportEmail: z.string().optional(),
  supportPhone: z.string().optional(),
  adminEmail: z.string().optional(),
  supportAddress: z.string().optional(),
  maintenanceMode: z.boolean().optional().default(false),
  socialLinks: z.record(z.string()).optional().default({}),
});

const homepageParagraphSchema = z.object({
  sectionKey: z.enum(HOMEPAGE_PARAGRAPH_SECTION_KEYS),
  content: z.string().trim().min(1, "Paragraph content is required.").max(500, "Keep the paragraph under 500 characters."),
});

const homepageParagraphDeleteSchema = z.object({
  sectionKey: z.enum(HOMEPAGE_PARAGRAPH_SECTION_KEYS),
});

const newsletterSchema = z.object({
  subject: z.string().min(3, "Newsletter subject is required."),
  previewText: z.string().optional(),
  html: z.string().min(10, "Newsletter content is required."),
  subscriberIds: z.array(z.string()).optional().default([]),
});

function optionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function nullableString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function optionalNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseDate(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseJson(value?: string | Record<string, unknown>) {
  if (!value) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return { mode: trimmed };
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function ensureUniqueCourseSlug(baseValue: string, reserved = new Set<string>()) {
  const baseSlug = slugify(baseValue) || `course-${Date.now()}`;
  let nextSlug = baseSlug;
  let suffix = 2;

  while (reserved.has(nextSlug) || (await prisma.course.findUnique({ where: { slug: nextSlug }, select: { id: true } }))) {
    nextSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  reserved.add(nextSlug);
  return nextSlug;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "Please review the form and try again.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "That record already exists. Adjust the unique fields and try again.";
  }

  if (isPrismaConnectionError(error)) {
    return "The database is temporarily unavailable. Please try again in a moment.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while saving your changes.";
}

function revalidateMany(paths: string[]) {
  Array.from(new Set(paths)).forEach((path) => revalidatePath(path));
}

async function runAdminAction<T>(
  label: string,
  paths: string[],
  action: () => Promise<T>,
  successMessage: string
): Promise<ActionResult<T>> {
  try {
    const data = await action();
    revalidateMany(paths);
    return { success: true, message: successMessage, data };
  } catch (error) {
    console.error(`[admin] ${label} failed.`, error);
    return { success: false, message: getErrorMessage(error) };
  }
}

async function runValidatedAdminAction<TSchema extends z.ZodTypeAny, T>(
  schema: TSchema,
  input: z.input<TSchema>,
  label: string,
  paths: string[],
  action: (values: z.output<TSchema>) => Promise<T>,
  successMessage: string
): Promise<ActionResult<T>> {
  return runAdminAction(
    label,
    paths,
    async () => {
      const values = schema.parse(input);
      return action(values);
    },
    successMessage
  );
}

async function deleteAssetPath(path?: string | null) {
  await deleteAdminStorageObjects([path]);
}

async function syncCourseCurriculum(
  courseId: string,
  sections: Array<z.output<typeof sectionSchema>>
) {
  const existingModules = await prisma.module.findMany({
    where: { courseId },
    include: {
      lessons: {
        select: {
          id: true,
          assetPath: true,
        },
      },
    },
  });

  const existingModulesById = new Map(existingModules.map((module) => [module.id, module]));
  const incomingModuleIds = new Set(sections.map((section) => section.id).filter(Boolean));
  const modulesToDelete = existingModules.filter((module) => !incomingModuleIds.has(module.id));

  if (modulesToDelete.length > 0) {
    await deleteAdminStorageObjects(
      modulesToDelete.flatMap((module) => module.lessons.map((lesson) => lesson.assetPath))
    );
    await prisma.module.deleteMany({
      where: {
        id: { in: modulesToDelete.map((module) => module.id) },
      },
    });
  }

  for (const [sectionIndex, section] of sections.entries()) {
    const existingModule = section.id ? existingModulesById.get(section.id) : null;
    const moduleRecord = existingModule
      ? await prisma.module.update({
          where: { id: existingModule.id },
          data: {
            title: section.title.trim(),
            description: optionalString(section.description),
            order: sectionIndex,
          },
        })
      : await prisma.module.create({
          data: {
            courseId,
            title: section.title.trim(),
            description: optionalString(section.description),
            order: sectionIndex,
          },
        });

    const existingLessonsById = new Map((existingModule?.lessons ?? []).map((lesson) => [lesson.id, lesson]));
    const incomingLessonIds = new Set(section.lessons.map((lesson) => lesson.id).filter(Boolean));
    const lessonsToDelete = (existingModule?.lessons ?? []).filter(
      (lesson) => !incomingLessonIds.has(lesson.id)
    );

    if (lessonsToDelete.length > 0) {
      await deleteAdminStorageObjects(lessonsToDelete.map((lesson) => lesson.assetPath));
      await prisma.lesson.deleteMany({
        where: {
          id: { in: lessonsToDelete.map((lesson) => lesson.id) },
        },
      });
    }

    for (const [lessonIndex, lesson] of section.lessons.entries()) {
      const lessonPayload = {
        title: lesson.title.trim(),
        description: optionalString(lesson.description),
        type: lesson.type as LessonType,
        videoUrl:
          lesson.type === "VIDEO" || lesson.type === "LIVE"
            ? nullableString(lesson.assetUrl)
            : null,
        assetUrl: nullableString(lesson.assetUrl),
        assetPath: nullableString(lesson.assetPath),
        duration: optionalNumber(lesson.duration),
        content: optionalString(lesson.content),
        isPreview: Boolean(lesson.isPreview),
        allowDownload: Boolean(lesson.allowDownload),
        sellSeparately: Boolean(lesson.sellSeparately),
        order: lessonIndex,
      };

      const existingLesson = lesson.id ? existingLessonsById.get(lesson.id) : null;

      if (existingLesson?.assetPath && existingLesson.assetPath !== lessonPayload.assetPath) {
        await deleteAssetPath(existingLesson.assetPath);
      }

      if (existingLesson) {
        await prisma.lesson.update({
          where: { id: existingLesson.id },
          data: lessonPayload,
        });
      } else {
        await prisma.lesson.create({
          data: {
            moduleId: moduleRecord.id,
            ...lessonPayload,
          },
        });
      }
    }
  }

  const modules = await prisma.module.findMany({
    where: { courseId },
    include: {
      lessons: {
        select: {
          duration: true,
        },
      },
    },
  });

  const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const totalDurationSeconds = modules.reduce(
    (sum, module) =>
      sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + (lesson.duration ?? 0), 0),
    0
  );

  await prisma.course.update({
    where: { id: courseId },
    data: {
      totalLessons,
      totalDuration: Math.ceil(totalDurationSeconds / 60),
    },
  });
}

export async function saveCategoryAction(input: z.input<typeof categorySchema>) {
  return runValidatedAdminAction(
    categorySchema,
    input,
    "saveCategory",
    ["/admin", "/admin/categories", "/courses", "/blog", "/"],
    async (values) => {
      const slug = slugify(values.slug || values.name);

      return prisma.category.upsert({
        where: { id: values.id || "__new__" },
        update: {
          name: values.name.trim(),
          slug,
          description: optionalString(values.description),
          imageUrl: optionalString(values.imageUrl),
          imagePath: optionalString(values.imagePath),
          icon: optionalString(values.icon),
          color: optionalString(values.color),
          isActive: Boolean(values.isActive),
          parentId: nullableString(values.parentId),
        },
        create: {
          name: values.name.trim(),
          slug,
          description: optionalString(values.description),
          imageUrl: optionalString(values.imageUrl),
          imagePath: optionalString(values.imagePath),
          icon: optionalString(values.icon),
          color: optionalString(values.color),
          isActive: Boolean(values.isActive),
          parentId: nullableString(values.parentId),
        },
      });
    },
    "Category saved successfully."
  );
}

export async function deleteCategoryAction(id: string) {
  return runAdminAction(
    "deleteCategory",
    ["/admin", "/admin/categories", "/courses", "/blog", "/"],
    async () => prisma.category.delete({ where: { id } }),
    "Category deleted successfully."
  );
}

export async function refundOrderAction(orderId: string) {
  return runAdminAction(
    "refundOrder",
    ["/admin", "/admin/orders", "/admin/users"],
    async () => {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!order) {
        throw new Error("Order not found.");
      }

      if (order.status !== "COMPLETED") {
        throw new Error("Only paid orders can be refunded.");
      }

      return prisma.order.update({
        where: { id: orderId },
        data: {
          status: "REFUNDED",
        },
      });
    },
    "Order refunded successfully."
  );
}

export async function grantOrderAccessAction(orderId: string) {
  return runAdminAction(
    "grantOrderAccess",
    ["/admin", "/admin/orders", "/admin/users"],
    async () => {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            select: {
              courseId: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found.");
      }

      if (order.status !== "COMPLETED") {
        throw new Error("Only paid orders can grant access.");
      }

      if (order.items.length === 0) {
        throw new Error("This order does not include any course items.");
      }

      await Promise.all(
        order.items.map((item) =>
          prisma.enrollment.upsert({
            where: {
              userId_courseId: {
                userId: order.userId,
                courseId: item.courseId,
              },
            },
            update: {
              status: "ACTIVE",
              expiresAt: null,
            },
            create: {
              userId: order.userId,
              courseId: item.courseId,
              status: "ACTIVE",
            },
          })
        )
      );

      return order;
    },
    "Course access granted successfully."
  );
}

export async function saveUserAction(input: z.input<typeof userSchema>) {
  return runValidatedAdminAction(
    userSchema,
    input,
    "saveUser",
    ["/admin", "/admin/users"],
    async (values) => {
      const email = normalizeEmail(values.email);

      if (values.id) {
        return prisma.user.update({
          where: { id: values.id },
          data: {
            email,
            name: optionalString(values.name),
            avatarUrl: optionalString(values.avatarUrl),
            bio: optionalString(values.bio),
            country: optionalString(values.country),
            role: values.role as Role,
          },
        });
      }

      return prisma.user.create({
        data: {
          email,
          name: optionalString(values.name),
          avatarUrl: optionalString(values.avatarUrl),
          bio: optionalString(values.bio),
          country: optionalString(values.country),
          role: values.role as Role,
        },
      });
    },
    "User saved successfully."
  );
}

export async function deleteUserAction(id: string) {
  return runAdminAction(
    "deleteUser",
    ["/admin", "/admin/users"],
    async () => prisma.user.delete({ where: { id } }),
    "User deleted successfully."
  );
}

export async function getUserDetailsAction(userId: string) {
  return runAdminAction("getUserDetails", ["/admin/users"], async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrollments: {
          include: {
            course: {
              include: {
                modules: {
                  include: {
                    lessons: {
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
        },
        orders: {
          include: {
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
          orderBy: { createdAt: "desc" },
        },
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: { createdAt: "desc" },
        },
        certificates: {
          include: {
            course: {
              select: {
                title: true,
                slug: true,
              },
            },
          },
          orderBy: { issuedAt: "desc" },
        },
        progress: {
          include: {
            lesson: {
              include: {
                module: {
                  select: {
                    courseId: true,
                    course: {
                      select: {
                        title: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    const includedCourseIds = Array.from(
      new Set(
        user.subscriptions.flatMap((subscription) =>
          subscription.plan.coursesIncluded.filter((courseId) => courseId !== "ALL")
        )
      )
    );
    const includedCourses = includedCourseIds.length
      ? await prisma.course.findMany({
          where: { id: { in: includedCourseIds } },
          select: {
            id: true,
            title: true,
          },
        })
      : [];
    const includedCourseMap = new Map(includedCourses.map((course) => [course.id, course.title]));

    const progressByCourse = user.progress.reduce(
      (accumulator, progress) => {
        const courseId = progress.lesson.module.courseId;
        const existing = accumulator.get(courseId) ?? [];
        existing.push(progress);
        accumulator.set(courseId, existing);
        return accumulator;
      },
      new Map<string, typeof user.progress>()
    );

    const enrollments = user.enrollments.map((enrollment) => {
      const courseProgress = progressByCourse.get(enrollment.courseId) ?? [];
      const completedLessons = courseProgress.filter((progress) => progress.isCompleted).length;
      const totalLessons = enrollment.course.modules.reduce(
        (sum, module) => sum + module.lessons.length,
        0
      );

      return {
        id: enrollment.id,
        courseTitle: enrollment.course.title,
        courseSlug: enrollment.course.slug,
        thumbnailUrl: enrollment.course.thumbnailUrl,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        completedAt: enrollment.completedAt?.toISOString(),
        progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        completedLessons,
        totalLessons,
      };
    });

    const payments = user.orders.map((order) => ({
      id: order.id,
      amount: order.totalAmount,
      currency: order.currency,
      status: order.status,
      date: order.createdAt.toISOString(),
      items: order.items.map((item) => item.course.title),
      paymentMethod: order.paymentMethod,
      receiptUrl: order.receiptUrl,
    }));

    const subscriptions = user.subscriptions.map((subscription) => ({
      id: subscription.id,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      startedAt: subscription.currentPeriodStart.toISOString(),
      endsAt: subscription.currentPeriodEnd.toISOString(),
      planName: subscription.plan.name,
      revenueGenerated:
        subscription.billingCycle.toLowerCase() === "yearly"
          ? subscription.plan.yearlyPrice ?? subscription.plan.price
          : subscription.plan.price,
      coursesIncluded: subscription.plan.coursesIncluded.includes("ALL")
        ? ["All published courses"]
        : subscription.plan.coursesIncluded.map((courseId) => includedCourseMap.get(courseId) || courseId),
    }));

    const certificates = user.certificates.map((certificate) => ({
      id: certificate.id,
      code: certificate.code,
      issuedAt: certificate.issuedAt.toISOString(),
      pdfUrl: certificate.pdfUrl,
      courseTitle: certificate.course.title,
      courseSlug: certificate.course.slug,
    }));

    const activity = [
      {
        id: `joined-${user.id}`,
        type: "account",
        label: "Account created",
        detail: "Learner profile was created in the platform.",
        date: user.createdAt.toISOString(),
      },
      ...user.enrollments.map((enrollment) => ({
        id: `enrollment-${enrollment.id}`,
        type: "enrollment",
        label: `Enrolled in ${enrollment.course.title}`,
        detail: `Status: ${enrollment.status.toLowerCase()}`,
        date: enrollment.enrolledAt.toISOString(),
      })),
      ...user.orders.map((order) => ({
        id: `order-${order.id}`,
        type: "payment",
        label: `Payment ${order.status.toLowerCase()}`,
        detail: `${order.items.map((item) => item.course.title).join(", ") || "Course purchase"} • ${order.currency} ${order.totalAmount}`,
        date: order.createdAt.toISOString(),
      })),
      ...user.progress.slice(0, 8).map((progress) => ({
        id: `progress-${progress.id}`,
        type: "lesson",
        label: progress.isCompleted ? "Completed lesson" : "Visited lesson",
        detail: `${progress.lesson.title} • ${progress.lesson.module.course.title}`,
        date: (progress.completedAt ?? progress.updatedAt).toISOString(),
      })),
      ...user.subscriptions.map((subscription) => ({
        id: `subscription-${subscription.id}`,
        type: "subscription",
        label: `${subscription.plan.name} subscription ${subscription.status.toLowerCase()}`,
        detail: `${subscription.billingCycle} billing cycle`,
        date: subscription.createdAt.toISOString(),
      })),
      ...user.certificates.map((certificate) => ({
        id: `certificate-${certificate.id}`,
        type: "certificate",
        label: `Certificate earned in ${certificate.course.title}`,
        detail: `Certificate code ${certificate.code}`,
        date: certificate.issuedAt.toISOString(),
      })),
    ]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 16);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      country: user.country,
      preferredCurrency: user.preferredCurrency,
      stripeCustomerId: user.stripeCustomerId,
      joinedAt: user.createdAt.toISOString(),
      enrollments,
      payments,
      subscriptions,
      certificates,
      activity,
    };
  }, "User details loaded.");
}

export async function updateUserRoleAction(input: z.input<typeof userRoleUpdateSchema>) {
  return runValidatedAdminAction(
    userRoleUpdateSchema,
    input,
    "updateUserRole",
    ["/admin/users", "/admin/user-subscriptions"],
    async (values) =>
      prisma.user.update({
        where: { id: values.userId },
        data: {
          role: values.role as Role,
        },
      }),
    "User role updated successfully."
  );
}

export async function saveCourseAction(input: z.input<typeof courseSchema>) {
  return runValidatedAdminAction(
    courseSchema,
    input,
    "saveCourse",
    ["/admin", "/admin/courses", "/courses", "/"],
    async (values) => {
      const slug = slugify(values.slug || values.title);
      const isFree = Boolean(values.isFree);
      const payload = {
        title: values.title.trim(),
        slug,
        description: values.description.trim(),
        shortDescription: optionalString(values.shortDescription),
        imageUrl: optionalString(values.imageUrl),
        imagePath: optionalString(values.imagePath),
        thumbnailUrl: optionalString(values.thumbnailUrl),
        thumbnailPath: optionalString(values.thumbnailPath),
        categoryId: values.categoryId,
        instructorId: values.instructorId,
        level: values.level as Level,
        language: optionalString(values.language) || "English",
        price: isFree ? 0 : values.price,
        originalPrice: optionalNumber(values.originalPrice),
        isFree,
        isPublished: values.status === "PUBLISHED",
        isFeatured: Boolean(values.isFeatured),
        isTrending: Boolean(values.isTrending),
        isRecommended: Boolean(values.isRecommended),
        isNew: Boolean(values.isNew),
        tags: uniqueStrings(values.tags),
        whatYouLearn: uniqueStrings(values.whatYouLearn),
        requirements: uniqueStrings(values.requirements),
      };

      if (values.id) {
        const course = await prisma.course.update({
          where: { id: values.id },
          data: payload,
        });

        if (values.curriculum) {
          await syncCourseCurriculum(course.id, values.curriculum);
        }

        revalidatePath(`/courses/${slug}`);
        return course;
      }

      const course = await prisma.course.create({
        data: {
          ...payload,
          totalDuration: 0,
          totalLessons: 0,
          totalStudents: 0,
          rating: 0,
          totalRatings: 0,
          targetAudience: [],
        },
      });

      if (values.curriculum) {
        await syncCourseCurriculum(course.id, values.curriculum);
      }

      revalidatePath(`/courses/${slug}`);
      return course;
    },
    "Course saved successfully."
  );
}

export async function deleteCourseAction(id: string) {
  return runAdminAction(
    "deleteCourse",
    ["/admin", "/admin/courses", "/courses", "/"],
    async () => {
      const course = await prisma.course.findUnique({
        where: { id },
        include: {
          assets: true,
          modules: {
            include: {
              lessons: {
                select: {
                  assetPath: true,
                },
              },
            },
          },
        },
      });

      await deleteAdminStorageObjects([
        course?.imagePath,
        course?.thumbnailPath,
        ...((course?.assets || []).map((asset) => asset.storagePath) ?? []),
        ...((course?.modules || []).flatMap((module) => module.lessons.map((lesson) => lesson.assetPath)) ?? []),
      ]);

      return prisma.course.delete({ where: { id } });
    },
    "Course deleted successfully."
  );
}

export async function bulkImportCoursesAction(input: z.input<typeof bulkImportCoursesSchema>) {
  return runValidatedAdminAction(
    bulkImportCoursesSchema,
    input,
    "bulkImportCourses",
    ["/admin", "/admin/courses", "/courses", "/"],
    async (values) => {
      const categories = await prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      const categoryMap = new Map<string, string>();
      categories.forEach((category) => {
        categoryMap.set(category.id.toLowerCase(), category.id);
        categoryMap.set(category.name.toLowerCase(), category.id);
        categoryMap.set(category.slug.toLowerCase(), category.id);
      });

      const reservedSlugs = new Set<string>();
      const errors: string[] = [];
      let imported = 0;

      for (const course of values.courses) {
        const categoryId = categoryMap.get(course.category.trim().toLowerCase());

        if (!categoryId) {
          errors.push(`"${course.title}" skipped because category "${course.category}" was not found.`);
          continue;
        }

        const slug = await ensureUniqueCourseSlug(course.slug || course.title, reservedSlugs);

        await prisma.course.create({
          data: {
            title: course.title.trim(),
            slug,
            description: course.description.trim(),
            shortDescription: optionalString(course.shortDescription),
            categoryId,
            instructorId: values.defaultInstructorId,
            level: (course.level || "BEGINNER") as Level,
            language: optionalString(course.language) || "English",
            price: course.isFree ? 0 : course.price,
            isFree: Boolean(course.isFree),
            isPublished: course.status === "PUBLISHED",
            isFeatured: Boolean(course.isFeatured),
            isTrending: Boolean(course.isTrending),
            isRecommended: Boolean(course.isRecommended),
            isNew: Boolean(course.isNew),
            tags: uniqueStrings(course.tags),
            whatYouLearn: uniqueStrings(course.whatYouLearn),
            requirements: uniqueStrings(course.requirements),
            targetAudience: [],
            totalDuration: 0,
            totalLessons: 0,
            totalStudents: 0,
            rating: 0,
            totalRatings: 0,
          },
        });

        imported += 1;
      }

      return {
        imported,
        errors,
      };
    },
    "Courses imported successfully."
  );
}

export async function saveCourseAssetAction(input: z.input<typeof courseAssetSchema>) {
  return runValidatedAdminAction(
    courseAssetSchema,
    input,
    "saveCourseAsset",
    ["/admin/courses"],
    async (values) => {
      if (values.id) {
        return prisma.courseAsset.update({
          where: { id: values.id },
          data: {
            type: values.type as CourseAssetType,
            title: values.title.trim(),
            fileName: values.fileName,
            storagePath: values.storagePath,
            url: values.url,
            mimeType: optionalString(values.mimeType),
            sizeBytes: optionalNumber(values.sizeBytes),
            order: values.order,
          },
        });
      }

      return prisma.courseAsset.create({
        data: {
          courseId: values.courseId,
          type: values.type as CourseAssetType,
          title: values.title.trim(),
          fileName: values.fileName,
          storagePath: values.storagePath,
          url: values.url,
          mimeType: optionalString(values.mimeType),
          sizeBytes: optionalNumber(values.sizeBytes),
          order: values.order,
        },
      });
    },
    "Course asset saved successfully."
  );
}

export async function deleteCourseAssetAction(id: string) {
  return runAdminAction(
    "deleteCourseAsset",
    ["/admin/courses"],
    async () => {
      const asset = await prisma.courseAsset.findUnique({ where: { id } });
      await deleteAssetPath(asset?.storagePath);
      return prisma.courseAsset.delete({ where: { id } });
    },
    "Course asset deleted successfully."
  );
}

export async function saveBlogAction(input: z.input<typeof blogSchema>) {
  return runValidatedAdminAction(
    blogSchema,
    input,
    "saveBlog",
    ["/admin/blogs", "/blog", "/", "/admin"],
    async (values) => {
      const slug = slugify(values.slug || values.title);
      const status = values.status as ContentStatus;
      const publishedAt = status === "PUBLISHED" ? new Date() : null;
      const existing = values.id
        ? await prisma.blogPost.findUnique({ where: { id: values.id } })
        : null;

      const post = await prisma.blogPost.upsert({
        where: { id: values.id || "__new__" },
        update: {
          title: values.title.trim(),
          slug,
          excerpt: optionalString(values.excerpt),
          content: values.content,
          coverImage: optionalString(values.coverImage),
          coverImagePath: optionalString(values.coverImagePath),
          authorId: values.authorId,
          categoryId: nullableString(values.categoryId),
          tags: uniqueStrings(values.tags),
          status,
          isPublished: status === "PUBLISHED",
          publishedAt: status === "PUBLISHED" ? existing?.publishedAt || publishedAt : null,
        },
        create: {
          title: values.title.trim(),
          slug,
          excerpt: optionalString(values.excerpt),
          content: values.content,
          coverImage: optionalString(values.coverImage),
          coverImagePath: optionalString(values.coverImagePath),
          authorId: values.authorId,
          categoryId: nullableString(values.categoryId),
          tags: uniqueStrings(values.tags),
          status,
          isPublished: status === "PUBLISHED",
          publishedAt,
        },
      });

      revalidatePath(`/blog/${slug}`);
      return post;
    },
    "Blog post saved successfully."
  );
}

export async function deleteBlogAction(id: string) {
  return runAdminAction(
    "deleteBlog",
    ["/admin/blogs", "/blog", "/", "/admin"],
    async () => {
      const post = await prisma.blogPost.findUnique({ where: { id } });
      await deleteAssetPath(post?.coverImagePath);
      return prisma.blogPost.delete({ where: { id } });
    },
    "Blog post deleted successfully."
  );
}

export async function saveSubscriptionPlanAction(input: z.input<typeof planSchema>) {
  return runValidatedAdminAction(
    planSchema,
    input,
    "saveSubscriptionPlan",
    ["/admin", "/admin/subscriptions", "/pricing", "/"],
    async (values) => {
      const slug = slugify(values.slug || values.name);

      return prisma.subscriptionPlan.upsert({
        where: { id: values.id || "__new__" },
        update: {
          name: values.name.trim(),
          slug,
          description: optionalString(values.description),
          price: values.price,
          yearlyPrice: optionalNumber(values.yearlyPrice),
          currency: values.currency.toUpperCase(),
          features: uniqueStrings(values.features),
          coursesIncluded: uniqueStrings(values.coursesIncluded),
          isPopular: Boolean(values.isPopular),
          isActive: Boolean(values.isActive),
        },
        create: {
          name: values.name.trim(),
          slug,
          description: optionalString(values.description),
          price: values.price,
          yearlyPrice: optionalNumber(values.yearlyPrice),
          currency: values.currency.toUpperCase(),
          features: uniqueStrings(values.features),
          coursesIncluded: uniqueStrings(values.coursesIncluded),
          isPopular: Boolean(values.isPopular),
          isActive: Boolean(values.isActive),
        },
      });
    },
    "Subscription plan saved successfully."
  );
}

export async function deleteSubscriptionPlanAction(id: string) {
  return runAdminAction(
    "deleteSubscriptionPlan",
    ["/admin", "/admin/subscriptions", "/pricing", "/"],
    async () => prisma.subscriptionPlan.delete({ where: { id } }),
    "Subscription plan deleted successfully."
  );
}

export async function saveAnnouncementAction(input: z.input<typeof announcementSchema>) {
  return runValidatedAdminAction(
    announcementSchema,
    input,
    "saveAnnouncement",
    ["/admin", "/admin/announcements", "/"],
    async (values) =>
      prisma.announcement.upsert({
        where: { id: values.id || "__new__" },
        update: {
          text: values.text.trim(),
          link: optionalString(values.link),
          linkText: optionalString(values.linkText),
          bgColor: optionalString(values.bgColor) || "#2563eb",
          startsAt: parseDate(values.startsAt),
          endsAt: parseDate(values.endsAt),
          isActive: Boolean(values.isActive),
        },
        create: {
          text: values.text.trim(),
          link: optionalString(values.link),
          linkText: optionalString(values.linkText),
          bgColor: optionalString(values.bgColor) || "#2563eb",
          startsAt: parseDate(values.startsAt),
          endsAt: parseDate(values.endsAt),
          isActive: Boolean(values.isActive),
        },
      }),
    "Announcement saved successfully."
  );
}

export async function deleteAnnouncementAction(id: string) {
  return runAdminAction(
    "deleteAnnouncement",
    ["/admin", "/admin/announcements", "/"],
    async () => prisma.announcement.delete({ where: { id } }),
    "Announcement deleted successfully."
  );
}

export async function saveHeroSlideAction(input: z.input<typeof heroSchema>) {
  return runValidatedAdminAction(
    heroSchema,
    input,
    "saveHeroSlide",
    ["/admin", "/admin/hero", "/admin/hero-slides", "/"],
    async (values) => {
      const imagePath = optionalString(values.imagePath);
      const existing = values.id
        ? await prisma.heroSlide.findUnique({
            where: { id: values.id },
            select: { imagePath: true },
          })
        : null;

      const slideData = {
        title: values.title.trim(),
        subtitle: optionalString(values.subtitle),
        description: optionalString(values.description),
        imageUrl: values.imageUrl,
        imagePath,
        ctaText: optionalString(values.ctaText),
        ctaLink: optionalString(values.ctaLink),
        order: values.order,
        isActive: Boolean(values.isActive),
        autoSlideInterval: values.autoSlideInterval ?? null,
      };

      const slide = await prisma.heroSlide.upsert({
        where: { id: values.id || "__new__" },
        update: slideData,
        create: slideData,
      });

      if (existing?.imagePath && existing.imagePath !== imagePath) {
        await deleteAssetPath(existing.imagePath);
      }

      return slide;
    },
    "Hero slide saved successfully."
  );
}

export async function deleteHeroSlideAction(id: string) {
  return runAdminAction(
    "deleteHeroSlide",
    ["/admin", "/admin/hero", "/admin/hero-slides", "/"],
    async () => {
      const slide = await prisma.heroSlide.findUnique({ where: { id } });
      await deleteAssetPath(slide?.imagePath);
      return prisma.heroSlide.delete({ where: { id } });
    },
    "Hero slide deleted successfully."
  );
}

export async function saveCouponAction(input: z.input<typeof couponSchema>) {
  return runValidatedAdminAction(
    couponSchema,
    input,
    "saveCoupon",
    ["/admin/coupons", "/checkout"],
    async (values) =>
      prisma.coupon.upsert({
        where: { id: values.id || "__new__" },
        update: {
          code: values.code.trim().toUpperCase(),
          description: optionalString(values.description),
          discountType: values.discountType as CouponDiscountType,
          value: values.value,
          expiresAt: parseDate(values.expiresAt),
          usageLimit: optionalNumber(values.usageLimit),
          isActive: Boolean(values.isActive),
        },
        create: {
          code: values.code.trim().toUpperCase(),
          description: optionalString(values.description),
          discountType: values.discountType as CouponDiscountType,
          value: values.value,
          expiresAt: parseDate(values.expiresAt),
          usageLimit: optionalNumber(values.usageLimit),
          isActive: Boolean(values.isActive),
        },
      }),
    "Coupon saved successfully."
  );
}

export async function deleteCouponAction(id: string) {
  return runAdminAction(
    "deleteCoupon",
    ["/admin/coupons", "/checkout"],
    async () => prisma.coupon.delete({ where: { id } }),
    "Coupon deleted successfully."
  );
}

export async function saveReviewAction(input: z.input<typeof reviewSchema>) {
  return runValidatedAdminAction(
    reviewSchema,
    input,
    "saveReview",
    ["/admin/reviews", "/courses", "/"],
    async (values) => {
      const review = await prisma.review.upsert({
        where: { id: values.id || "__new__" },
        update: {
          userId: values.userId,
          courseId: values.courseId,
          rating: values.rating,
          title: optionalString(values.title),
          body: values.body.trim(),
          isApproved: Boolean(values.isApproved),
          isFeatured: Boolean(values.isFeatured),
        },
        create: {
          userId: values.userId,
          courseId: values.courseId,
          rating: values.rating,
          title: optionalString(values.title),
          body: values.body.trim(),
          isApproved: Boolean(values.isApproved),
          isFeatured: Boolean(values.isFeatured),
        },
      });

      await syncCourseReviewMetrics(review.courseId);
      return review;
    },
    "Review saved successfully."
  );
}

export async function deleteReviewAction(id: string) {
  return runAdminAction(
    "deleteReview",
    ["/admin/reviews", "/courses", "/"],
    async () => {
      const review = await prisma.review.delete({ where: { id } });
      await syncCourseReviewMetrics(review.courseId);
      return review;
    },
    "Review deleted successfully."
  );
}

export async function savePopupAction(input: z.input<typeof popupSchema>) {
  return runValidatedAdminAction(
    popupSchema,
    input,
    "savePopup",
    ["/admin/popups", "/"],
    async (values) => {
      const imagePath = optionalString(values.imagePath);
      const existing = values.id
        ? await prisma.popup.findUnique({
            where: { id: values.id },
            select: { imagePath: true },
          })
        : null;
      const triggerRules = (
        parseJson(values.triggerRules) ?? {
          showOn: values.showOn,
          delaySeconds: values.delaySeconds,
        }
      ) as Prisma.InputJsonValue;

      const popup = await prisma.popup.upsert({
        where: { id: values.id || "__new__" },
        update: {
          title: values.title.trim(),
          content: values.content.trim(),
          imageUrl: optionalString(values.imageUrl),
          imagePath,
          buttonText: optionalString(values.buttonText),
          link: optionalString(values.link),
          showOn: values.showOn as PopupShowOn,
          delaySeconds: values.delaySeconds,
          isActive: Boolean(values.isActive),
          startsAt: parseDate(values.startsAt),
          endsAt: parseDate(values.endsAt),
          triggerRules,
        },
        create: {
          title: values.title.trim(),
          content: values.content.trim(),
          imageUrl: optionalString(values.imageUrl),
          imagePath,
          buttonText: optionalString(values.buttonText),
          link: optionalString(values.link),
          showOn: values.showOn as PopupShowOn,
          delaySeconds: values.delaySeconds,
          isActive: Boolean(values.isActive),
          startsAt: parseDate(values.startsAt),
          endsAt: parseDate(values.endsAt),
          triggerRules,
        },
      });

      if (existing?.imagePath && existing.imagePath !== imagePath) {
        await deleteAssetPath(existing.imagePath);
      }

      return popup;
    },
    "Popup saved successfully."
  );
}

export async function deletePopupAction(id: string) {
  return runAdminAction(
    "deletePopup",
    ["/admin/popups", "/"],
    async () => {
      const popup = await prisma.popup.findUnique({ where: { id } });
      await deleteAssetPath(popup?.imagePath);
      return prisma.popup.delete({ where: { id } });
    },
    "Popup deleted successfully."
  );
}

export async function saveSiteSettingsAction(input: z.input<typeof settingsSchema>) {
  return runValidatedAdminAction(
    settingsSchema,
    input,
    "saveSiteSettings",
    ["/admin/settings", "/", "/pricing"],
    async (values) =>
      prisma.siteSettings.upsert({
        where: { id: "singleton" },
        update: {
          siteName: values.siteName.trim(),
          supportEmail: optionalString(values.supportEmail),
          supportPhone: optionalString(values.supportPhone),
          adminEmail: optionalString(values.adminEmail),
          supportAddress: optionalString(values.supportAddress),
          maintenanceMode: Boolean(values.maintenanceMode),
          socialLinks: values.socialLinks,
        },
        create: {
          id: "singleton",
          siteName: values.siteName.trim(),
          supportEmail: optionalString(values.supportEmail),
          supportPhone: optionalString(values.supportPhone),
          adminEmail: optionalString(values.adminEmail),
          supportAddress: optionalString(values.supportAddress),
          maintenanceMode: Boolean(values.maintenanceMode),
          socialLinks: values.socialLinks,
        },
      }),
    "Settings saved successfully."
  );
}

export async function saveHomepageParagraphAction(input: z.input<typeof homepageParagraphSchema>) {
  return runValidatedAdminAction(
    homepageParagraphSchema,
    input,
    "saveHomepageParagraph",
    ["/", "/admin/paragraphs"],
    async (values) =>
      prisma.homepageParagraph.upsert({
        where: { sectionKey: values.sectionKey },
        update: {
          content: values.content.trim(),
        },
        create: {
          sectionKey: values.sectionKey,
          content: values.content.trim(),
        },
      }),
    "Homepage paragraph saved successfully."
  );
}

export async function deleteHomepageParagraphAction(input: z.input<typeof homepageParagraphDeleteSchema>) {
  return runValidatedAdminAction(
    homepageParagraphDeleteSchema,
    input,
    "deleteHomepageParagraph",
    ["/", "/admin/paragraphs"],
    async (values) =>
      prisma.homepageParagraph.deleteMany({
        where: { sectionKey: values.sectionKey },
      }),
    "Homepage paragraph reset to default copy."
  );
}

export async function saveFaqAction(input: z.input<typeof faqSchema>) {
  return runValidatedAdminAction(
    faqSchema,
    input,
    "saveFaq",
    ["/admin/settings"],
    async (values) =>
      prisma.fAQ.upsert({
        where: { id: values.id || "__new__" },
        update: {
          question: values.question.trim(),
          answer: values.answer.trim(),
          sortOrder: values.sortOrder,
          isActive: Boolean(values.isActive),
        },
        create: {
          question: values.question.trim(),
          answer: values.answer.trim(),
          sortOrder: values.sortOrder,
          isActive: Boolean(values.isActive),
        },
      }),
    "FAQ saved successfully."
  );
}

export async function deleteFaqAction(id: string) {
  return runAdminAction(
    "deleteFaq",
    ["/admin/settings"],
    async () => prisma.fAQ.delete({ where: { id } }),
    "FAQ deleted successfully."
  );
}

export async function toggleSubscriberStatusAction(id: string, isActive: boolean) {
  return runAdminAction(
    "toggleSubscriberStatus",
    ["/admin/subscribers"],
    async () =>
      prisma.newsletterSubscriber.update({
        where: { id },
        data: { isActive },
      }),
    `Subscriber ${isActive ? "activated" : "paused"} successfully.`
  );
}

export async function deleteSubscriberAction(id: string) {
  return runAdminAction(
    "deleteSubscriber",
    ["/admin/subscribers"],
    async () => prisma.newsletterSubscriber.delete({ where: { id } }),
    "Subscriber removed successfully."
  );
}

export async function sendNewsletterAction(input: z.input<typeof newsletterSchema>) {
  return runValidatedAdminAction(
    newsletterSchema,
    input,
    "sendNewsletter",
    ["/admin/subscribers"],
    async (values) => {
      if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not configured, so the newsletter cannot be sent yet.");
      }

      const subscribers = await prisma.newsletterSubscriber.findMany({
        where: values.subscriberIds.length
          ? { id: { in: values.subscriberIds }, isActive: true }
          : { isActive: true },
        select: {
          email: true,
        },
      });

      if (subscribers.length === 0) {
        throw new Error("There are no active subscribers selected.");
      }

      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const siteSettings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
      const fromAddress =
        process.env.RESEND_FROM_EMAIL ||
        siteSettings?.supportEmail ||
        "noreply@ailearningclass.com";

      await resend.emails.send({
        from: fromAddress,
        to: subscribers.map((subscriber) => subscriber.email),
        subject: values.subject.trim(),
        html: `
          <div style="font-family: Inter, Arial, sans-serif; margin: 0 auto; max-width: 720px; padding: 32px; background: #f8fbff; color: #0f172a;">
            <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #2563eb;">
              ${siteSettings?.siteName || "AI Learning Class"}
            </p>
            <h1 style="margin: 0 0 12px; font-size: 32px; line-height: 1.15; color: #020617;">
              ${values.subject.trim()}
            </h1>
            ${
              optionalString(values.previewText)
                ? `<p style="margin: 0 0 28px; font-size: 16px; color: #475569;">${values.previewText?.trim()}</p>`
                : ""
            }
            <div style="border-radius: 24px; background: white; padding: 28px; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);">
              ${values.html}
            </div>
          </div>
        `,
      });

      return { sent: subscribers.length };
    },
    "Newsletter sent successfully."
  );
}
