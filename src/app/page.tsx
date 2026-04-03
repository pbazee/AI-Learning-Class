import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroCarousel } from "@/components/landing/HeroCarousel";
import { CategoriesGrid } from "@/components/landing/CategoriesGrid";
import { CourseSection } from "@/components/landing/CourseSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { BlogSection } from "@/components/landing/BlogSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { AffiliateSection } from "@/components/landing/AffiliateSection";
import { TrustedLogosMarquee } from "@/components/landing/TrustedLogosMarquee";
import { getUserWishlistCourseIds } from "@/lib/learner-records";
import {
  getBlogPosts,
  getCategories,
  getCurrentUserProfile,
  getCourses,
  getHeroSlides,
  getHomepageParagraphContentMap,
  getSubscriptionPlans,
  getTestimonials,
  getTrustedLogos,
  getUserAffiliateStatus,
  getUserCourseAccessMap,
} from "@/lib/data";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export default async function HomePage() {
  const [
    courses,
    categories,
    slides,
    testimonials,
    posts,
    plans,
    viewer,
    homepageParagraphs,
    trustedLogos,
  ] = await Promise.all([
    getCourses(),
    getCategories(),
    getHeroSlides(),
    getTestimonials(4),
    getBlogPosts(3),
    getSubscriptionPlans(),
    getCurrentUserProfile(),
    getHomepageParagraphContentMap(),
    getTrustedLogos(),
  ]);
  const [courseAccessMap, affiliateStatus] = viewer
    ? await Promise.all([
        getUserCourseAccessMap(
          viewer.id,
          courses.map((course) => course.id)
        ),
        getUserAffiliateStatus(viewer.id),
      ])
    : [{}, { hasJoined: false, status: null }];
  const wishlistCourseIds = viewer
    ? await getUserWishlistCourseIds(
        viewer.id,
        courses.map((course) => course.id)
      )
    : [];

  const featured = courses.filter((course) => course.isFeatured);
  const trending = courses.filter((course) => course.isTrending);
  const newCourses = courses.filter((course) => course.isNew);
  const popular = [...courses]
    .sort((left, right) => right.totalStudents - left.totalStudents)
    .slice(0, 8);
  const totalLearners = courses.reduce(
    (sum, course) => sum + course.totalStudents,
    0
  );
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
    { value: compactNumberFormatter.format(totalLearners), label: "Learners" },
    { value: weightedRating > 0 ? weightedRating.toFixed(1) : "New", label: "Rating" },
    { value: compactNumberFormatter.format(courses.length), label: "Courses" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroCarousel slides={slides} stats={heroStats} />
      <TrustedLogosMarquee logos={trustedLogos} />
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
        viewerId={viewer?.id}
        courseAccessMap={courseAccessMap}
        wishlistCourseIds={wishlistCourseIds}
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
        viewerId={viewer?.id}
        courseAccessMap={courseAccessMap}
        wishlistCourseIds={wishlistCourseIds}
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
        viewerId={viewer?.id}
        courseAccessMap={courseAccessMap}
        wishlistCourseIds={wishlistCourseIds}
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
        viewerId={viewer?.id}
        courseAccessMap={courseAccessMap}
        wishlistCourseIds={wishlistCourseIds}
      />
      <TestimonialsSection testimonials={testimonials} />
      <BlogSection posts={posts} />
      <PricingSection plans={plans} />
      <AffiliateSection hasJoined={affiliateStatus.hasJoined} />
      <Footer />
    </div>
  );
}
