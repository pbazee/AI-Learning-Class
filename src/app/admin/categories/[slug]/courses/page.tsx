import { notFound } from "next/navigation";
import { CategoryCoursesView } from "@/components/admin/category-courses-view";
import { prisma } from "@/lib/prisma";

export default async function AdminCategoryCoursesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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
    notFound();
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
