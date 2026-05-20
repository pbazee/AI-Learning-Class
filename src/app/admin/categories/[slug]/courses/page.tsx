import { notFound } from "next/navigation";
import { CategoryCoursesView } from "@/components/admin/category-courses-view";
import { prisma } from "@/lib/prisma";


export default async function AdminCategoryCoursesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { category, courses } = await (async () => {
    try {
      const category = await prisma.category.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              courses: true,
            },
          },
        },
      });

      if (!category) {
        return { category: null, courses: [] };
      }

      const courses = await prisma.course.findMany({
        where: {
          categoryId: category.id,
        },
        include: {
          instructor: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
        orderBy: [{ isPublished: "desc" }, { title: "asc" }],
      });

      return { category, courses };
    } catch (error) {
      console.error(
        "[database] admin category courses query failed. Returning a safe fallback while the database catches up.",
        error
      );
      return { category: null, courses: [] };
    }
  })();

  if (!category) {
    notFound();
  }

  return (
    <CategoryCoursesView
      category={{
        id: category.id,
        name: category.name,
        slug: category.slug,
        courseCount: category._count.courses,
      }}
      courses={courses.map((course) => ({
        id: course.id,
        slug: course.slug,
        title: course.title,
        thumbnailUrl: course.thumbnailUrl || course.imageUrl,
        instructorName: course.instructor.name || course.instructor.email || "Unknown instructor",
        isPublished: course.isPublished,
        price: course.price,
        currency: course.currency,
        enrollments: course._count.enrollments,
      }))}
    />
  );
}
