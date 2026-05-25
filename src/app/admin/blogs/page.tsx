import { prisma } from "@/lib/prisma";
import { BlogsManager } from "@/components/admin/blogs-manager";


const publishedFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminBlogsPage() {
  const { posts, categories, authors } = await (async () => {
    try {
      const [posts, categories, authors] = await Promise.all([
        prisma.blogPost.findMany({
          include: {
            category: {
              select: {
                name: true,
              },
            },
            author: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.category.findMany({
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
          where: {
            role: { in: ["ADMIN", "SUPER_ADMIN", "INSTRUCTOR"] },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      return { posts, categories, authors };
    } catch (error) {
      console.error(
        "[database] admin blogs query failed. Returning a safe fallback while the database catches up.",
        error
      );
      return { posts: [], categories: [], authors: [] };
    }
  })();

  return (
    <BlogsManager
      posts={posts.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        coverImagePath: post.coverImagePath,
        authorAvatarUrl: post.authorAvatarUrl,
        authorAvatarPath: post.authorAvatarPath,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        focusKeyword: post.focusKeyword,
        ogTitle: post.ogTitle,
        ogDescription: post.ogDescription,
        ogImageUrl: post.ogImageUrl,
        ogImagePath: post.ogImagePath,
        canonicalUrl: post.canonicalUrl,
        noIndex: post.noIndex,
        authorId: post.authorId,
        authorName: post.author.name || post.author.email || "Unknown author",
        categoryId: post.categoryId,
        categoryName: post.category?.name,
        status: post.status,
        tags: post.tags,
        publishedAt: post.publishedAt ? publishedFormatter.format(post.publishedAt) : null,
      }))}
      categoryOptions={categories.map((category) => ({
        label: category.name,
        value: category.id,
      }))}
      authorOptions={authors.map((author) => ({
        label: author.name || author.email || "Unknown author",
        value: author.id,
      }))}
    />
  );
}
