import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Clock, BookOpen, Tag } from "lucide-react";
import { getBlogPosts } from "@/lib/data";

export default async function BlogPage() {
  const posts = await getBlogPosts();
  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags)));
  const [featured, ...rest] = posts;

  if (!featured) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div>
          <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <h1 className="mb-3 text-3xl font-black text-foreground">The AI Journal is empty right now</h1>
            <p className="text-muted-foreground">
              Publish your first database-backed blog post to populate this page.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div>
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium uppercase tracking-wider text-blue-600">AI Journal</span>
            </div>
            <h1 className="mb-3 text-4xl font-black text-foreground">
              The <span className="text-blue-600">AI Learning</span> Blog
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              Deep dives on LLMs, ML research breakdowns, career guides, and tutorials from leading AI practitioners.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
            <div className="space-y-8 lg:col-span-3">
              <Link href={`/blog/${featured.slug}`} className="group block">
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-700">
                  <div className="relative aspect-[2/1] overflow-hidden">
                    {featured.coverImage && (
                      <Image
                        src={featured.coverImage}
                        alt={featured.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute left-4 top-4">
                      <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                        Featured
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {featured.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h2 className="mb-2 text-xl font-black text-foreground transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{featured.excerpt}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{featured.authorName}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {featured.readTime}
                        </span>
                        <span>{featured.publishedAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {rest.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-700">
                      <div className="relative aspect-video overflow-hidden">
                        {post.coverImage && (
                          <Image
                            src={post.coverImage}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                          {post.tags.slice(0, 1).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="mb-2 line-clamp-2 font-bold text-foreground transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="mb-3 flex-1 line-clamp-2 text-xs text-muted-foreground">{post.excerpt}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{post.authorName}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.readTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-6 lg:col-span-1">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
                  <Tag className="h-4 w-4 text-blue-600" /> Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/blog?tag=${tag}`}
                      className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-400"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950/20">
                <h3 className="mb-2 text-sm font-bold text-foreground">Weekly AI Digest</h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  Top papers, tutorials, and career insights every Saturday.
                </p>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
                />
                <button className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700">
                  Subscribe - It&apos;s Free
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-foreground">Popular Posts</h3>
                <div className="space-y-4">
                  {posts.map((post, index) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="group flex items-start gap-3">
                      <span className="w-6 shrink-0 text-2xl font-black text-muted/40">{index + 1}</span>
                      <div>
                        <p className="line-clamp-2 text-xs font-medium text-foreground transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {post.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{post.readTime}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
