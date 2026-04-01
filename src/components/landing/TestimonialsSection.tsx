"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import type { Testimonial } from "@/types";

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className="section-shell relative overflow-hidden bg-white dark:bg-gray-950 dark:text-white">
      <div className="absolute inset-x-0 top-10 h-60 bg-blue-50/80 blur-3xl dark:bg-primary-blue/10" />

      <div className="section-frame relative">
        <div className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <Star className="h-4 w-4 fill-current" />
            <span>Student success stories</span>
          </div>
          <h2 className="mb-4 text-3xl font-black text-foreground sm:text-4xl">
            Career outcomes with a <span className="gradient-text">clear learning path</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground">
            Learners use AI Learning Class to gain practical skills, ship projects, and move into stronger roles.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="surface-card flex flex-col gap-4 p-6"
            >
              <Quote className="h-8 w-8 text-blue-200" />

              <div className="flex items-center gap-0.5">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="flex-1 text-sm leading-7 text-muted-foreground">"{t.text}"</p>

              {t.courseCompleted && (
                <div className="inline-flex w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  Completed: {t.courseCompleted}
                </div>
              )}

              <div className="flex items-center gap-3 border-t border-border pt-4">
                {t.avatar && (
                  <Image
                    src={t.avatar}
                    alt={t.name}
                    width={44}
                    height={44}
                    className="rounded-full ring-2 ring-blue-100"
                  />
                )}
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                  {t.country && <div className="text-xs text-muted-foreground">{t.country}</div>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button className="action-secondary">View more reviews</button>
        </div>
      </div>
    </section>
  );
}
