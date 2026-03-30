import { prisma } from "@/lib/prisma";
import { CategoriesManager } from "@/components/admin/categories-manager";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      parent: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          courses: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <CategoriesManager
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        color: category.color,
        isActive: category.isActive,
        parentId: category.parentId,
        parentName: category.parent?.name,
        courseCount: category._count.courses,
      }))}
      parentOptions={categories.map((category) => ({
        label: category.name,
        value: category.id,
      }))}
    />
  );
}
