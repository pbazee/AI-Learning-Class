import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-server";


const staticPages: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "daily", priority: 0.8 },
  { path: "/categories", changeFrequency: "weekly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/courses", changeFrequency: "daily", priority: 0.9 },
  { path: "/leaderboard", changeFrequency: "weekly", priority: 0.6 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.8 },
  { path: "/reviews", changeFrequency: "weekly", priority: 0.6 },
  { path: "/affiliate", changeFrequency: "monthly", priority: 0.7 },
  { path: "/faqs", changeFrequency: "monthly", priority: 0.7 },
  { path: "/paths", changeFrequency: "weekly", priority: 0.7 },
  { path: "/team", changeFrequency: "monthly", priority: 0.7 },
  { path: "/certificates", changeFrequency: "monthly", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await (async () => {
    try {
      return await prisma.course.findMany({
        where: { isPublished: true },
        select: {
          slug: true,
          updatedAt: true,
          createdAt: true,
        },
        orderBy: { updatedAt: "desc" },
      });
    } catch (error) {
      console.error(
        "[database] sitemap course query failed. Returning a safe fallback while the database catches up.",
        error
      );
      return [];
    }
  })();

  const blogPosts = await (async () => {
    try {
      return await prisma.blogPost.findMany({
        where: {
          OR: [{ status: "PUBLISHED" }, { isPublished: true }],
        },
        select: {
          slug: true,
          updatedAt: true,
          createdAt: true,
        },
        orderBy: { updatedAt: "desc" },
      });
    } catch (error) {
      console.error(
        "[database] sitemap blog query failed. Returning a safe fallback while the database catches up.",
        error
      );
      return [];
    }
  })();

  return [
    ...staticPages.map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...courses.map((course) => ({
      url: absoluteUrl(`/courses/${course.slug}`),
      lastModified: course.updatedAt ?? course.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...blogPosts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updatedAt ?? post.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
  ];
}
