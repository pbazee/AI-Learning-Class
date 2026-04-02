"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Clock, BookOpen } from "lucide-react";
import type { BlogPost } from "@/types";

export function BlogSection({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="section-shell border-t border-border/70">
      <div className="section-frame">
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-blue/20 bg-primary-blue/10 px-3 py-1.5 text-xs font-semibold text-primary-blue">
              <BookOpen className="h-3.5 w-3.5" />
              AI Journal
            </div>
            <h2 className="text-2xl font-black text-foreground sm:text-3xl">Latest from the blog</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Tutorials, research summaries, and career guidance written for ambitious AI learners.
            </p>
          </div>

          <Link
            href="/blog"
            className="hidden items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-primary-blue shadow-sm hover:border-primary-blue/30 hover:bg-primary-blue/10 sm:inline-flex"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link href={`/blog/${post.slug}`} className="group block h-full">
                <div className="surface-card flex h-full flex-col overflow-hidden transition-all hover:-translate-y-1 hover:border-primary-blue/30">
                  <div className="relative aspect-video overflow-hidden">
                    {post.coverImage && (
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-primary-blue shadow-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary-blue">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mb-4 line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <span>{post.authorName}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex justify-center sm:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-primary-blue shadow-sm hover:border-primary-blue/30 hover:bg-primary-blue/10"
          >
            View all posts
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
