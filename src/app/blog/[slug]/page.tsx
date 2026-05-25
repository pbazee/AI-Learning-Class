import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BlogSharePopover } from "@/components/blog/BlogSharePopover";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { Clock, ArrowLeft, Tag, BookOpen } from "lucide-react";
import { IMAGE_BLUR_DATA_URL } from "@/lib/image-placeholder";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/data";
import { sanitizeHtml } from "@/lib/sanitize";
import { buildBlogPostJsonLd } from "@/lib/seo";
import { resolveMediaUrl } from "@/lib/media";
import { absoluteUrl, buildSiteMetadata, getSiteBranding } from "@/lib/site-server";

function getInitial(name?: string) {
  return (name || "A").trim().slice(0, 1).toUpperCase();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return buildSiteMetadata(`/blog/${slug}`, {
      title: "Article Not Found",
      description: "This article could not be found.",
    });
  }

  const canonicalUrl = post.canonicalUrl?.trim() || undefined;
  const shareImage =
    resolveMediaUrl({
      url: post.ogImageUrl || post.coverImage,
      path: post.ogImagePath,
      fallback: post.coverImage || "",
    }) || undefined;
  const metadataDescription =
    post.metaDescription?.trim() || post.excerpt || post.content?.slice(0, 160) || post.title;

  return buildSiteMetadata(`/blog/${post.slug}`, {
    title: post.title,
    description: metadataDescription,
    image: shareImage,
    canonicalUrl,
    openGraphTitle: post.title,
    openGraphDescription: post.excerpt || post.ogDescription?.trim() || metadataDescription,
    robots: post.noIndex
      ? {
          index: false,
          follow: true,
          googleBot: {
            index: false,
            follow: true,
          },
        }
      : undefined,
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const related = (await getBlogPosts(6)).filter((entry) => entry.slug !== slug).slice(0, 2);
  const content = sanitizeHtml((post.content || post.excerpt || "").trim());
  const branding = await getSiteBranding();
  const canonicalUrl = post.canonicalUrl?.trim() || absoluteUrl(`/blog/${post.slug}`);
  const articleJsonLd = buildBlogPostJsonLd(post, branding);

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={articleJsonLd} />
      <div className="w-full">
        <div className="relative w-full">
          {post.coverImage && (
            <div className="relative w-full aspect-[16/7] min-h-[18rem] overflow-hidden bg-slate-100 dark:bg-slate-900 sm:max-h-[28rem]">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                priority
                quality={75}
                placeholder="blur"
                blurDataURL={IMAGE_BLUR_DATA_URL}
                sizes="100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </div>
          )}
          <div className={post.coverImage ? "absolute inset-x-0 bottom-0" : "border-b border-border bg-card"}>
            <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
              <Link
                href="/blog"
                className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Blog
              </Link>
              <div className="mb-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1
                className={`mb-4 text-2xl font-black leading-tight sm:text-4xl ${
                  post.coverImage ? "text-white" : "text-foreground"
                }`}
              >
                {post.title}
              </h1>
              <div
                className={`flex flex-wrap items-center gap-4 text-sm ${
                  post.coverImage ? "text-white/70" : "text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  {post.authorAvatarUrl ? (
                    <Image
                      src={post.authorAvatarUrl}
                      alt={post.authorName || "Author"}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5"
                    />
                  ) : (
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        post.coverImage
                          ? "bg-white/15 text-white ring-1 ring-white/20"
                          : "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                      }`}
                    >
                      {getInitial(post.authorName)}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={`font-medium ${post.coverImage ? "text-white/90" : "text-foreground"}`}>
                      {post.authorName}
                    </span>
                    <span>{post.publishedAt}</span>
                  </div>
                </div>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readTime}
                </span>
                <BlogSharePopover canonicalUrl={canonicalUrl} title={post.ogTitle || post.metaTitle || post.title} />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-12 lg:px-8">
          {post.excerpt && (
            <p className="mb-8 border-b border-border pb-8 text-lg font-medium leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          )}

          <div
            className="blog-content"
            dangerouslySetInnerHTML={{
              __html: content,
            }}
          />

          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-border pt-8">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-400"
              >
                {tag}
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/20">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="mb-1 font-bold text-foreground">Want to master these concepts?</h4>
                <p className="mb-3 text-sm text-muted-foreground">
                  We have hands-on courses taught by industry experts covering everything in this article.
                </p>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Browse Courses →
                </Link>
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <div className="mt-12">
              <h3 className="mb-6 text-lg font-black text-foreground">Related Articles</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {related.map((entry) => (
                  <Link key={entry.id} href={`/blog/${entry.slug}`} className="group block">
                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-700">
                      {entry.coverImage && (
                        <div className="relative h-28 overflow-hidden">
                          <Image
                            src={entry.coverImage}
                            alt={entry.title}
                            fill
                            quality={75}
                            placeholder="blur"
                            blurDataURL={IMAGE_BLUR_DATA_URL}
                            sizes="(min-width: 640px) 26vw, 100vw"
                            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        {entry.categoryName ? (
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                            {entry.categoryName}
                          </p>
                        ) : null}
                        <p className="line-clamp-2 text-sm font-bold text-foreground transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {entry.title}
                        </p>
                        {entry.excerpt ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {entry.excerpt}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">{entry.readTime}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
