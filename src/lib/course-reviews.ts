import { prisma } from "@/lib/prisma";

export async function syncCourseReviewMetrics(courseId: string) {
  const aggregate = await prisma.review.aggregate({
    where: {
      courseId,
      isApproved: true,
    },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });

  return prisma.course.update({
    where: { id: courseId },
    data: {
      rating: Number((aggregate._avg.rating ?? 0).toFixed(1)),
      totalRatings: aggregate._count.rating ?? 0,
    },
  });
}
