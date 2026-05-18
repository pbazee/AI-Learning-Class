import { prisma } from "@/lib/prisma";
import { CoursesManager } from "@/components/admin/courses-manager";
import { ensureLessonPreviewColumns } from "@/lib/lesson-preview";
import { ensureLessonAssetsTable } from "@/lib/lesson-assets-table";
import { ensureSubscriptionPlansTable } from "@/lib/subscription-plans";
import { getLessonAssetDisplayTitle, inferLessonAssetKind } from "@/lib/lesson-assets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminCoursesPage() {
  await ensureLessonPreviewColumns();
  await ensureLessonAssetsTable();
  await ensureSubscriptionPlansTable();

  const { courses, categories, instructors, activePlans } = await (async () => {
    try {
      const [courses, categories, instructors, activePlans] = await Promise.all([
        prisma.course.findMany({
          include: {
            category: {
              select: {
                name: true,
              },
            },
            instructor: {
              select: {
                name: true,
                email: true,
              },
            },
            assets: {
              orderBy: { createdAt: "desc" },
            },
            modules: {
              orderBy: { order: "asc" },
              include: {
                lessons: {
                  orderBy: { order: "asc" },
                  include: {
                    lessonAssets: {
                      orderBy: { sortOrder: "asc" },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.category.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
          },
        }),
        prisma.user.findMany({
          where: {
            role: { in: ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"] },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
          },
        }),
        prisma.subscriptionPlan.findMany({
          where: { isActive: true },
          select: {
            coursesIncluded: true,
          },
        }),
      ]);

      return { courses, categories, instructors, activePlans };
    } catch (error) {
      console.error(
        "[database] admin courses query failed. Returning a safe fallback while the database catches up.",
        error
      );
      return { courses: [], categories: [], instructors: [], activePlans: [] };
    }
  })();

  const subscriptionCourseSet = new Set<string>();
  const subscriptionIncludesAll = activePlans.some((plan) => plan.coursesIncluded.includes("ALL"));
  activePlans.forEach((plan) => {
    plan.coursesIncluded.forEach((courseId) => subscriptionCourseSet.add(courseId));
  });

  return (
    <CoursesManager
      courses={courses.map((course) => ({
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        shortDescription: course.shortDescription,
        imageUrl: course.imageUrl,
        imagePath: course.imagePath,
        categoryId: course.categoryId,
        categoryName: course.category.name,
        instructorId: course.instructorId,
        instructorName: course.instructor.name || course.instructor.email || "Unknown instructor",
        level: course.level,
        price: course.price,
        isFree: course.isFree,
        isPublished: course.isPublished,
        isFeatured: course.isFeatured,
        isTrending: course.isTrending,
        isRecommended: course.isRecommended,
        isNew: course.isNew,
        thumbnailUrl: course.thumbnailUrl,
        thumbnailPath: course.thumbnailPath,
        language: course.language,
        totalStudents: course.totalStudents,
        rating: course.rating,
        tags: course.tags,
        whatYouLearn: course.whatYouLearn,
        requirements: course.requirements,
        assets: course.assets.map((asset) => ({
          id: asset.id,
          type: asset.type,
          title: asset.title,
          fileName: asset.fileName,
          url: asset.url,
          storagePath: asset.storagePath,
          mimeType: asset.mimeType,
          sizeBytes: asset.sizeBytes,
        })),
        curriculum: course.modules.map((section) => ({
          id: section.id,
          title: section.title,
          description: section.description,
          order: section.order,
          lessons: section.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            type: lesson.type,
            assetUrl: lesson.assetUrl,
            assetPath: lesson.assetPath,
            assets:
              lesson.lessonAssets.length > 0
                ? lesson.lessonAssets.map((asset) => ({
                    id: asset.id,
                    assetType: asset.assetType,
                    assetUrl: asset.assetUrl,
                    assetPath: asset.assetPath ?? "",
                    fileName: asset.fileName ?? "",
                    mimeType: asset.mimeType ?? undefined,
                    sizeBytes: asset.sizeBytes ?? undefined,
                    title: asset.title ?? asset.fileName ?? "",
                    isPrimary: asset.isPrimary,
                    sortOrder: asset.sortOrder,
                  }))
                : lesson.assetUrl
                  ? [
                      {
                        assetType:
                          inferLessonAssetKind({
                            assetUrl: lesson.assetUrl,
                          }) === "PDF"
                            ? "PDF"
                            : inferLessonAssetKind({
                                assetUrl: lesson.assetUrl,
                              }) === "VIDEO"
                              ? "VIDEO"
                              : inferLessonAssetKind({
                                  assetUrl: lesson.assetUrl,
                                }) === "IMAGE"
                                ? "IMAGE"
                              : "FILE",
                        assetUrl: lesson.assetUrl,
                        assetPath: lesson.assetPath ?? "",
                        fileName: getLessonAssetDisplayTitle({ assetUrl: lesson.assetUrl }),
                        mimeType: undefined,
                        sizeBytes: undefined,
                        title: getLessonAssetDisplayTitle({ assetUrl: lesson.assetUrl }),
                        isPrimary: true,
                        sortOrder: 0,
                      },
                    ]
                  : [],
            duration: lesson.duration,
            content: lesson.content,
            isPreview: lesson.isPreview,
            previewPages: lesson.previewPages,
            previewMinutes: lesson.previewMinutes,
            sellSeparately: lesson.sellSeparately,
            order: lesson.order,
          })),
        })),
        hasSubscriptionAccess: subscriptionIncludesAll || subscriptionCourseSet.has(course.id),
      }))}
      categoryOptions={categories.map((category) => ({
        label: category.name,
        value: category.id,
      }))}
      instructorOptions={instructors.map((instructor) => ({
        label: instructor.name || instructor.email || "Unknown instructor",
        value: instructor.id,
      }))}
    />
  );
}
