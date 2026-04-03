"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import type { HeroSlide } from "@/types";

type HeroStat = {
  value: string;
  label: string;
};

const statIcons = [Users, BookOpen, Star];

function getMobileCtaText(label?: string) {
  const fallback = "Explore Courses";
  if (!label?.trim()) {
    return fallback;
  }

  const normalized = label.trim();
  if (/explore/i.test(normalized) && /course/i.test(normalized)) {
    return "Explore Courses";
  }

  if (normalized.length <= 18) {
    return normalized;
  }

  return fallback;
}

function getPrimaryCtaText(label?: string) {
  const fallback = "Explore Courses";
  if (!label?.trim()) {
    return fallback;
  }

  const normalized = label.trim();

  if (/explore/i.test(normalized) && /course/i.test(normalized)) {
    return fallback;
  }

  if (normalized.length <= 18) {
    return normalized;
  }

  return fallback;
}

export function HeroCarousel({
  slides,
  stats,
  averageRating,
  globalInterval = 6,
}: {
  slides: HeroSlide[];
  stats: HeroStat[];
  averageRating?: string;
  globalInterval?: number;
}) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const slideCount = slides.length;

  const next = useCallback(() => {
    if (slideCount === 0) {
      return;
    }

    setCurrent((previous) => (previous + 1) % slideCount);
  }, [slideCount]);

  const previous = useCallback(() => {
    if (slideCount === 0) {
      return;
    }

    setCurrent((previousIndex) => (previousIndex - 1 + slideCount) % slideCount);
  }, [slideCount]);

  const currentSlide = slides[current] ?? slides[0];
  const intervalMs = ((currentSlide?.autoSlideInterval ?? globalInterval) || 6) * 1000;

  useEffect(() => {
    if (paused || slideCount <= 1) {
      return;
    }

    const timer = window.setInterval(next, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, next, paused, slideCount]);

  const heroCards = useMemo(() => {
    const primaryStat = stats[0];
    const secondaryStat = stats[1];

    return [
      {
        eyebrow: "Featured Track",
        title: currentSlide?.subtitle || "Master LLM Engineering",
        body: "Live projects, prompt evaluation, retrieval workflows, and production-minded AI systems.",
      },
      {
        eyebrow: primaryStat?.label || "Learner momentum",
        title: primaryStat?.value || "Global",
        body: "Ambitious builders learning practical AI every day.",
      },
      {
        eyebrow: averageRating ? "Average Rating" : secondaryStat?.label || "Course library",
        title: averageRating ? `${averageRating}/5` : secondaryStat?.value || "Fresh weekly",
        body: averageRating ? "Backed by learner reviews across the platform." : "New labs, lessons, and guided pathways stay in rotation.",
      },
    ];
  }, [averageRating, currentSlide?.subtitle, stats]);

  if (slideCount === 0) {
    return null;
  }

  return (
    <section
      className="relative overflow-hidden"
      style={{
        minHeight:
          "calc(100svh - var(--announcement-height) - var(--navbar-height) - var(--mobile-bottom-nav-height))",
        height:
          "calc(100dvh - var(--announcement-height) - var(--navbar-height) - var(--mobile-bottom-nav-height))",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={`hero-background-${current}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <Image
            src={currentSlide.imageUrl}
            alt={currentSlide.title}
            fill
            priority
            quality={100}
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,86,210,0.28),transparent_42%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/92 via-[#020617]/76 to-[#020617]/42" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/72 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-between px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        <div className="grid min-h-0 flex-1 items-center gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-copy-${current}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.42 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm sm:text-xs">
                <Sparkles className="h-3.5 w-3.5 text-white" />
                {currentSlide.subtitle || "Master LLM Engineering"}
              </div>

              <h1 className="mt-4 text-[2rem] font-black leading-[0.92] text-white sm:mt-5 sm:text-[3.2rem] lg:text-[4.35rem]">
                {currentSlide.title}
              </h1>

              {currentSlide.description ? (
                <p className="mt-4 max-w-xl text-sm leading-7 text-white sm:mt-5 sm:text-base lg:text-lg">
                  {currentSlide.description}
                </p>
              ) : null}

              <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:flex-wrap">
                <Link
                  href={currentSlide.ctaLink || "/courses"}
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white shadow-[0_22px_50px_-28px_rgba(0,86,210,0.9)] transition hover:bg-primary-blue/90 sm:px-5 sm:py-3"
                >
                  <span className="sm:hidden">{getMobileCtaText(currentSlide.ctaText || "Explore LLM Courses")}</span>
                  <span className="hidden sm:inline">{getPrimaryCtaText(currentSlide.ctaText || "Explore LLM Courses")}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-3">
                {stats.map((stat, index) => {
                  const Icon = statIcons[index] ?? Sparkles;

                  return (
                    <div
                      key={stat.label}
                      className="rounded-[22px] border border-white/14 bg-white/10 px-4 py-3 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-black leading-none text-white">{stat.value}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white">{stat.label}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {averageRating ? (
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white">
                  <Star className="h-4 w-4 fill-current text-[#facc15]" />
                  <span>{averageRating} average rating from active learners</span>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:hidden">
                {heroCards.map((card) => (
                  <div
                    key={card.eyebrow}
                    className="rounded-[24px] border border-white/14 bg-white/10 p-4 backdrop-blur-md"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white">{card.eyebrow}</p>
                    <p className="mt-2 text-lg font-black text-white">{card.title}</p>
                    <p className="mt-2 text-xs leading-6 text-white">{card.body}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="relative hidden h-full min-h-[420px] lg:block">
            {heroCards.map((card, index) => (
              <motion.div
                key={card.eyebrow}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: [0, index % 2 === 0 ? -10 : 8, 0],
                }}
                transition={{
                  duration: 7 + index,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className={`absolute w-full rounded-[30px] border border-white/14 bg-white/12 p-6 text-white shadow-[0_26px_70px_-44px_rgba(2,6,23,0.95)] backdrop-blur-xl ${
                  index === 0
                    ? "right-0 top-[8%] max-w-[340px]"
                    : index === 1
                      ? "left-0 top-[42%] max-w-[280px]"
                      : "right-5 bottom-[8%] max-w-[300px]"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white">{card.eyebrow}</p>
                <p className="mt-3 text-[1.9rem] font-black leading-tight">{card.title}</p>
                <p className="mt-3 text-sm leading-7 text-white">{card.body}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2">
            {slides.map((_, index) => (
              <button
                key={slides[index]?.id || index}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => setCurrent(index)}
                className={`rounded-full transition-all ${
                  index === current ? "h-2.5 w-10 bg-white" : "h-2.5 w-2.5 bg-white/38"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={previous}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/16"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/16"
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
