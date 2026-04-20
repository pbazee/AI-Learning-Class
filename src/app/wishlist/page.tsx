import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CourseCard } from "@/components/courses/CourseCard";
import { getCourses, getCurrentUserProfile, getUserCourseAccessMap } from "@/lib/data";
import { getUserWishlistCourseIds } from "@/lib/learner-records";
import type { CourseAccessState } from "@/types";

export default async function WishlistPage() {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/login?redirect=/wishlist");
  }

  const wishlistCourseIds = await getUserWishlistCourseIds(user.id);
  const [allCourses, courseAccessMap] = await Promise.all([
    getCourses(),
    wishlistCourseIds.length > 0
      ? getUserCourseAccessMap(user.id, wishlistCourseIds)
      : Promise.resolve({} as Record<string, CourseAccessState>),
  ]);
  const courses = allCourses.filter((course) => wishlistCourseIds.includes(course.id));

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary-blue text-white shadow-[0_20px_40px_-24px_rgba(59,130,246,0.9)]">
            <Heart className="h-7 w-7 fill-current" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-primary-blue">
            Save For Later
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">
            Your saved courses are ready when you are.
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-sm leading-7 text-muted-foreground sm:text-base">
            Keep the courses you want to revisit in one focused place, then jump back into the classroom when you&apos;re ready.
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-[32px] border border-border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-black text-foreground">No saved courses yet</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Tap the heart on any course card to save it here.
            </p>
            <Link
              href="/courses"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary-blue px-5 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90"
            >
              Explore Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                index={index}
                viewerId={user.id}
                courseAccess={courseAccessMap[course.id]}
                isWishlisted
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
