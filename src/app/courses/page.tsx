import { CoursesCatalog } from "@/components/courses/CoursesCatalog";
import { StorefrontPersonalizationProvider } from "@/components/storefront/StorefrontPersonalizationProvider";
import { getPublicCourseCatalogData } from "@/lib/data";

export const revalidate = 300;

export default async function CoursesPage() {
  const { categories, courses } = await getPublicCourseCatalogData();

  return (
    <StorefrontPersonalizationProvider
      courseIds={courses.map((course) => course.id)}
    >
      <CoursesCatalog
        courses={courses}
        categories={categories}
      />
    </StorefrontPersonalizationProvider>
  );
}
