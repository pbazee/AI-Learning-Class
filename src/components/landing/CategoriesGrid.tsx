"use client";

import type { ElementType } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  Code2,
  Cpu,
  Eye,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { resolveMediaUrl } from "@/lib/media";
import type { Category } from "@/types";

const iconMap: Record<string, ElementType> = {
  Brain,
  Cpu,
  MessageSquare,
  Eye,
  Code2,
  Sparkles,
  BarChart3,
  Bot,
};

const fallbackImages = [
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=1600&fit=crop",
  "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=1600&fit=crop",
  "https://images.unsplash.com/photo-1676299081847-824916de030a?w=1200&h=1600&fit=crop",
  "https://images.unsplash.com/photo-1674027444485-cec3da58eef4?w=1200&h=1600&fit=crop",
];

export function CategoriesGrid({
  categories,
  sectionDescription,
  showViewMoreButton = false,
}: {
  categories: Category[];
  sectionDescription?: string;
  showViewMoreButton?: boolean;
}) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="section-shell relative">
      <div className="section-frame">
        <div className="mb-12 text-center">
          <div className="eyebrow-badge mb-4">
            <Sparkles className="h-4 w-4" />
            <span>Browse by AI skills</span>
          </div>
          <h2 className="mb-4 text-3xl font-black text-foreground sm:text-4xl">
            Find your <span className="gradient-text">learning path</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground">
            {sectionDescription ||
              "Choose the capability you want to build next, from machine learning foundations to advanced AI engineering."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => {
            const Icon = iconMap[category.icon || "Brain"] || Brain;
            const imageSrc = resolveMediaUrl({
              url: category.imageUrl,
              path: category.imagePath,
              fallback: fallbackImages[index % fallbackImages.length],
            });

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
              >
                <Link
                  href={`/courses?category=${category.slug}`}
                  className="group relative flex min-h-[420px] overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.7)] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary-blue/35 hover:shadow-[0_35px_120px_-40px_rgba(59,130,246,0.38)]"
                >
                  <Image
                    src={imageSrc}
                    alt={category.name}
                    fill
                    quality={100}
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-slate-950/10" />
                  {/* Updated: keep the image dominant and move the copy/action into the lower 25-30% of the card. */}
                  <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-slate-950/96 via-slate-950/58 to-transparent" />

                  <div className="relative z-10 flex h-full w-full flex-col justify-between p-6">
                    <div className="flex items-start">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/35 px-3.5 py-2 shadow-[0_10px_35px_rgba(2,6,23,0.35)] backdrop-blur-md">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/16 bg-white/10">
                          <Icon className="h-4 w-4 text-white drop-shadow-[0_4px_10px_rgba(2,6,23,0.8)]" />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white drop-shadow-[0_4px_14px_rgba(2,6,23,0.9)]">
                          {category.name}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto max-w-[15.75rem] space-y-4 pt-52 sm:pt-56">
                      <p className="line-clamp-3 text-sm leading-6 text-slate-100 drop-shadow-[0_8px_24px_rgba(2,6,23,0.8)] sm:text-base">
                        {category.description ||
                          "Explore a premium AI learning track designed to move you from foundations to real-world execution."}
                      </p>
                      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/18 bg-black/28 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(2,6,23,0.45)] transition-all duration-300 group-hover:border-primary-blue/40 group-hover:bg-primary-blue/18">
                        <span>Explore Track</span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {showViewMoreButton ? (
          <div className="mt-10 flex justify-center">
            <Link
              href="/categories"
              className="group inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-primary-blue shadow-[0_20px_40px_rgba(59,130,246,0.18)] transition-all hover:bg-primary-blue/10 sm:px-7 sm:text-base"
            >
              View More
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
