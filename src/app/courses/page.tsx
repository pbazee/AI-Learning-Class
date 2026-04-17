import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CoursesCatalog } from "@/components/courses/CoursesCatalog";
import { StorefrontPersonalizationProvider } from "@/components/storefront/StorefrontPersonalizationProvider";
import { getPublicCourseCatalogData } from "@/lib/data";
import { buildSiteMetadata } from "@/lib/site-server";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata("/courses", {
    title: "Courses",
    description:
      "Browse AI GENIUS LAB courses covering machine learning, prompt engineering, LLM apps, MLOps, and AI product building.",
  });
}

export default async function CoursesPage() {
  const { categories, courses } = await getPublicCourseCatalogData();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <StorefrontPersonalizationProvider
        courseIds={courses.map((course) => course.id)}
      >
        <CoursesCatalog
          courses={courses}
          categories={categories}
        />
      </StorefrontPersonalizationProvider>
      <Footer />
    </div>
  );
}
