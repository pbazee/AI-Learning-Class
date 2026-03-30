// src/app/page.tsx
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroCarousel } from "@/components/landing/HeroCarousel";
import { CategoriesGrid } from "@/components/landing/CategoriesGrid";
import { CourseSection } from "@/components/landing/CourseSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { BlogSection } from "@/components/landing/BlogSection";
import { PricingSection } from "@/components/landing/PricingSection";
import {
  getBlogPosts,
  getCategories,
  getCourses,
  getHeroSlides,
  getSubscriptionPlans,
  getTestimonials,
} from "@/lib/data";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export default async function HomePage() {
  const [courses, categories, slides, testimonials, posts, plans] = await Promise.all([
    getCourses(),
    getCategories(),
    getHeroSlides(),
    getTestimonials(4),
    getBlogPosts(3),
    getSubscriptionPlans(),
  ]);

  const featured = courses.filter((course) => course.isFeatured);
  const trending = courses.filter((course) => course.isTrending);
  const newCourses = courses.filter((course) => course.isNew);
  const popular = [...courses].sort((left, right) => right.totalStudents - left.totalStudents).slice(0, 4);
  const totalLearners = courses.reduce((sum, course) => sum + course.totalStudents, 0);
  const totalRatings = courses.reduce((sum, course) => sum + course.totalRatings, 0);
  const weightedRating =
    totalRatings > 0
      ? courses.reduce((sum, course) => sum + course.rating * course.totalRatings, 0) / totalRatings
      : 0;
  const heroStats = [
    {
      value: compactNumberFormatter.format(totalLearners),
      label: "Learner enrollments",
    },
    {
      value: compactNumberFormatter.format(courses.length),
      label: "Live courses",
    },
    {
      value: weightedRating > 0 ? `${weightedRating.toFixed(1)}★` : "New",
      label: "Average rating",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroCarousel
        slides={slides}
        stats={heroStats}
        averageRating={weightedRating > 0 ? weightedRating.toFixed(1) : undefined}
      />
      <CategoriesGrid categories={categories} />
      <CourseSection
        title="Featured Courses"
        subtitle="Handpicked by our team for maximum career impact."
        badge="Admin Curated"
        badgeIcon="star"
        courses={featured}
        viewAllHref="/courses?filter=featured"
        maxItems={4}
      />
      <CourseSection
        title="Trending Now"
        subtitle="What the global AI community is enrolling in this week."
        badge="Trending Worldwide"
        badgeIcon="flame"
        courses={trending}
        viewAllHref="/courses?filter=trending"
        maxItems={4}
      />
      <CourseSection
        title="Most Popular"
        subtitle="Top courses by total enrollment — proven and trusted."
        badge="All-Time Favorites"
        badgeIcon="star"
        courses={popular}
        viewAllHref="/courses?filter=popular"
        maxItems={4}
      />
      <CourseSection
        title="New Releases"
        subtitle="Fresh content on the latest AI tools, models, and techniques."
        badge="Just Launched"
        badgeIcon="clock"
        courses={newCourses}
        viewAllHref="/courses?filter=new"
        maxItems={4}
      />
      <TestimonialsSection testimonials={testimonials} />
      <BlogSection posts={posts} />
      <PricingSection plans={plans} />
      <Footer />
    </div>
  );
}
