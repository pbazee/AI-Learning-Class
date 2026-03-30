"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, Cpu, MessageSquare, Eye, Code2, Sparkles, BarChart3, Bot } from "lucide-react";
import type { Category } from "@/types";

const iconMap: Record<string, React.ElementType> = {
  Brain,
  Cpu,
  MessageSquare,
  Eye,
  Code2,
  Sparkles,
  BarChart3,
  Bot,
};

export function CategoriesGrid({ categories }: { categories: Category[] }) {
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
            Choose the capability you want to build next, from machine learning foundations to advanced AI engineering.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon || "Brain"] || Brain;

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  href={`/courses?category=${cat.slug}`}
                  className="surface-card group flex h-full flex-col gap-4 p-6 transition-all hover:-translate-y-1 hover:border-blue-300"
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl transition-all group-hover:scale-105"
                    style={{
                      background: `${cat.color}16`,
                      border: `1px solid ${cat.color}30`,
                    }}
                  >
                    <Icon className="h-7 w-7" style={{ color: cat.color }} />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-foreground transition-colors group-hover:text-blue-700">
                      {cat.name}
                    </div>
                    <div className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {cat.description}
                    </div>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                      Explore track
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
