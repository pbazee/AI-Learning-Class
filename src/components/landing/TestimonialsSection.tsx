"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import type { Testimonial } from "@/types";

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) {
    return null;
  }

  const featuredTestimonials = testimonials.slice(0, 4);
  const hasMoreTestimonials = testimonials.length > featuredTestimonials.length;

  return (
    <section className="section-shell relative overflow-hidden bg-primary-blue text-white dark:bg-primary-blue dark:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_48%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.12))]" />

      <div className="section-frame relative">
        <div className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.12] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_36px_-24px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <Star className="h-4 w-4 fill-current" />
            <span>Student success stories</span>
          </div>
          <h2 className="mb-4 text-3xl font-black text-white sm:text-4xl">
            Career outcomes with a <span className="text-white/90">clear learning path</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-white/[0.85]">
            Learners use AI Genius Lab to gain practical skills, ship projects, and move into stronger roles.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featuredTestimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col gap-4 rounded-[28px] border border-white/[0.16] bg-white/10 p-6 shadow-[0_30px_70px_-36px_rgba(15,23,42,0.55)] backdrop-blur-md"
            >
              <Quote className="h-8 w-8 text-white/60" />

              <div className="flex items-center gap-0.5">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="flex-1 text-sm leading-7 text-white/[0.88]">"{t.text}"</p>

              {t.courseCompleted ? (
                <div className="inline-flex w-fit rounded-full border border-white/[0.15] bg-white px-3 py-1.5 text-xs font-semibold text-primary-blue shadow-sm">
                  Completed: {t.courseCompleted}
                </div>
              ) : null}

              <div className="flex items-center gap-3 border-t border-white/[0.12] pt-4">
                {t.avatar && (
                  <Image
                    src={t.avatar}
                    alt={t.name}
                    width={44}
                    height={44}
                    className="rounded-full ring-2 ring-white/20"
                  />
                )}
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-white/75">{t.role}</div>
                  {t.country && <div className="text-xs text-white/[0.65]">{t.country}</div>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/reviews"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-primary-blue shadow-lg transition-transform hover:scale-105"
          >
            View More Reviews
          </Link>
        </div>
      </div>
    </section>
  );
}
