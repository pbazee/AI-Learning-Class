import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Clock, ArrowLeft, Tag, BookOpen, Share2 } from "lucide-react";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/data";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const related = (await getBlogPosts(6)).filter((entry) => entry.slug !== slug).slice(0, 2);
  const content = (post.content || post.excerpt || "").trim();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div>
        <div className="relative">
          {post.coverImage && (
            <div className="relative aspect-[3/1] max-h-80 overflow-hidden">
              <Image src={post.coverImage} alt={post.title} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </div>
          )}
          <div className={post.coverImage ? "absolute inset-x-0 bottom-0" : "border-b border-border bg-card"}>
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
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
                className={`flex items-center gap-4 text-sm ${
                  post.coverImage ? "text-white/70" : "text-muted-foreground"
                }`}
              >
                <span className={`font-medium ${post.coverImage ? "text-white/90" : "text-foreground"}`}>
                  {post.authorName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readTime}
                </span>
                <span>{post.publishedAt}</span>
                <button className="ml-auto flex items-center gap-1 opacity-60 transition-opacity hover:opacity-100">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          {post.excerpt && (
            <p className="mb-8 border-b border-border pb-8 text-lg font-medium leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          )}

          <div className="space-y-4">
            {content.split("\n\n").filter(Boolean).map((block, index) => {
              if (block.startsWith("## ")) {
                return (
                  <h2 key={index} className="mt-8 mb-3 text-xl font-black text-foreground">
                    {block.slice(3)}
                  </h2>
                );
              }

              if (block.startsWith("**") && block.endsWith("**")) {
                return (
                  <p key={index} className="font-semibold text-foreground">
                    {block.slice(2, -2)}
                  </p>
                );
              }

              if (block.startsWith("1. ")) {
                return (
                  <ol key={index} className="ml-4 space-y-2">
                    {block.split("\n").map((item, itemIndex) => (
                      <li key={itemIndex} className="text-sm leading-relaxed text-muted-foreground">
                        {item.replace(/^\d+\. /, "").replace(/\*\*(.*?)\*\*/g, "$1")}
                      </li>
                    ))}
                  </ol>
                );
              }

              if (block.startsWith("- ")) {
                return (
                  <ul key={index} className="ml-4 space-y-2">
                    {block.split("\n").map((item, itemIndex) => (
                      <li
                        key={itemIndex}
                        className="list-disc text-sm leading-relaxed text-muted-foreground"
                      >
                        {item.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}
                      </li>
                    ))}
                  </ul>
                );
              }

              return (
                <p
                  key={index}
                  className="text-sm leading-relaxed text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: block.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>'),
                  }}
                />
              );
            })}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-border pt-8">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${tag}`}
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
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <p className="line-clamp-2 text-sm font-bold text-foreground transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {entry.title}
                        </p>
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
