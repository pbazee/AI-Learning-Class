import { CoursesCatalog } from "@/components/courses/CoursesCatalog";
import { getCategories, getCourses, getCurrentUserProfile, getUserCourseAccessMap } from "@/lib/data";
import { getUserWishlistCourseIds } from "@/lib/learner-records";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; filter?: string }>;
}) {
  const [{ category, filter }, courses, categories, viewer] = await Promise.all([
    searchParams,
    getCourses(),
    getCategories(),
    getCurrentUserProfile(),
  ]);
  const courseAccessMap = viewer
    ? await getUserCourseAccessMap(
        viewer.id,
        courses.map((course) => course.id)
      )
    : {};
  const wishlistCourseIds = viewer
    ? await getUserWishlistCourseIds(
        viewer.id,
        courses.map((course) => course.id)
      )
    : [];

  return (
    <CoursesCatalog
      courses={courses}
      categories={categories}
      initialCategory={category ?? "all"}
      initialFilter={filter}
      viewerId={viewer?.id}
      courseAccessMap={courseAccessMap}
      wishlistCourseIds={wishlistCourseIds}
    />
  );
}
