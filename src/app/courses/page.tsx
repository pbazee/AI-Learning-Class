import { CoursesCatalog } from "@/components/courses/CoursesCatalog";
import { getCategories, getCourses } from "@/lib/data";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; filter?: string }>;
}) {
  const [{ category, filter }, courses, categories] = await Promise.all([
    searchParams,
    getCourses(),
    getCategories(),
  ]);

  return (
    <CoursesCatalog
      courses={courses}
      categories={categories}
      initialCategory={category ?? "all"}
      initialFilter={filter}
    />
  );
}
