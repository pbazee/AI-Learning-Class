import { prisma } from "@/lib/prisma";
import { ReviewsManager } from "@/components/admin/reviews-manager";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminReviewsPage() {
  const { reviews, users, courses } = await (async () => {
    try {
      const [reviews, users, courses] = await Promise.all([
        prisma.review.findMany({
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            course: {
              select: {
                title: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.course.findMany({
          select: {
            id: true,
            title: true,
          },
          orderBy: { title: "asc" },
        }),
      ]);

      return { reviews, users, courses };
    } catch (error) {
      console.error(
        "[database] admin reviews query failed. Returning a safe fallback while the database catches up.",
        error
      );
      return { reviews: [], users: [], courses: [] };
    }
  })();

  return (
    <ReviewsManager
      reviews={reviews.map((review) => ({
        id: review.id,
        userId: review.userId,
        userName: review.user.name || review.user.email || "Unknown learner",
        courseId: review.courseId,
        courseTitle: review.course.title,
        rating: review.rating,
        title: review.title,
        body: review.body,
        isApproved: review.isApproved,
        isFeatured: review.isFeatured,
        createdAt: dateFormatter.format(review.createdAt),
      }))}
      userOptions={users.map((user) => ({
        label: user.name || user.email,
        value: user.id,
      }))}
      courseOptions={courses.map((course) => ({
        label: course.title,
        value: course.id,
      }))}
    />
  );
}
