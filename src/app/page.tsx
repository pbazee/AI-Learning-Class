import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroCarousel } from "@/components/landing/HeroCarousel";
import { CourseSection } from "@/components/landing/CourseSection";
import { TrustedLogosMarquee } from "@/components/landing/TrustedLogosMarquee";
import { StorefrontPersonalizationProvider } from "@/components/storefront/StorefrontPersonalizationProvider";
import {
  getPublicHomepageData,
} from "@/lib/data";

const CategoriesGrid = dynamic(() =>
  import("@/components/landing/CategoriesGrid").then((module) => ({
    default: module.CategoriesGrid,
  }))
);
const TestimonialsSection = dynamic(() =>
  import("@/components/landing/TestimonialsSection").then((module) => ({
    default: module.TestimonialsSection,
  }))
);
const BlogSection = dynamic(() =>
  import("@/components/landing/BlogSection").then((module) => ({
    default: module.BlogSection,
  }))
);
const PricingSection = dynamic(() =>
  import("@/components/landing/PricingSection").then((module) => ({
    default: module.PricingSection,
  }))
);
const AffiliateSection = dynamic(() =>
  import("@/components/landing/AffiliateSection").then((module) => ({
    default: module.AffiliateSection,
  }))
);

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const revalidate = 300;

export default async function HomePage() {
  const {
    affiliateCommissionRate,
    categories,
    courses,
    homepageParagraphs,
    plans,
    posts,
    slides,
    testimonials,
    totalLoggedInUsers,
    trustedLogos,
  } = await getPublicHomepageData();

  const featured = courses.filter((course) => course.isFeatured);
  const trending = courses.filter((course) => course.isTrending);
  const newCourses = courses.filter((course) => course.isNew);
  const popular = [...courses]
    .sort((left, right) => right.totalStudents - left.totalStudents)
    .slice(0, 8);
  const totalRatings = courses.reduce(
    (sum, course) => sum + course.totalRatings,
    0
  );
  const weightedRating =
    totalRatings > 0
      ? courses.reduce(
          (sum, course) => sum + course.rating * course.totalRatings,
          0
        ) / totalRatings
      : 0;

  const heroStats = [
    { value: compactNumberFormatter.format(totalLoggedInUsers), label: "Learners" },
    { value: weightedRating > 0 ? weightedRating.toFixed(1) : "New", label: "Rating" },
    { value: compactNumberFormatter.format(courses.length), label: "Courses" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroCarousel slides={slides} stats={heroStats} />
      <TrustedLogosMarquee logos={trustedLogos} />
      <StorefrontPersonalizationProvider
        courseIds={courses.map((course) => course.id)}
        includeAffiliateStatus
      >
        <CategoriesGrid
          categories={categories.slice(0, 4)}
          sectionDescription={homepageParagraphs.learning_paths_subtitle}
          showViewMoreButton
        />
        <CourseSection
          title="Featured Courses"
          subtitle={homepageParagraphs.featured_courses_subtitle}
          badge="Admin Curated"
          badgeIcon="star"
          courses={featured}
          viewAllHref="/courses?filter=featured"
          viewAllLabel="View featured"
          maxItems={8}
        />
        <CourseSection
          title="Trending Now"
          subtitle={homepageParagraphs.trending_now_subtitle}
          badge="Trending Worldwide"
          badgeIcon="flame"
          courses={trending}
          viewAllHref="/courses?filter=trending"
          viewAllLabel="View trending"
          maxItems={8}
        />
        <CourseSection
          title="Most Popular"
          subtitle={homepageParagraphs.most_popular_subtitle}
          badge="All-Time Favorites"
          badgeIcon="star"
          courses={popular}
          viewAllHref="/courses?filter=popular"
          viewAllLabel="View popular"
          maxItems={8}
        />
        <CourseSection
          title="New Releases"
          subtitle={homepageParagraphs.new_releases_subtitle}
          badge="Just Launched"
          badgeIcon="clock"
          courses={newCourses}
          viewAllHref="/courses?filter=new-releases"
          viewAllLabel="View new releases"
          maxItems={8}
        />
        <TestimonialsSection testimonials={testimonials} />
        <BlogSection posts={posts} />
        <PricingSection plans={plans} />
        <AffiliateSection commissionRate={affiliateCommissionRate} />
      </StorefrontPersonalizationProvider>
      <Footer />
    </div>
  );
}
