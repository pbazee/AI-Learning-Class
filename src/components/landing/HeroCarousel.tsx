"use client";

import { useCallback, useEffect, useState } from "react";
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
import { IMAGE_BLUR_DATA_URL } from "@/lib/image-placeholder";
import type { HeroSlide } from "@/types";

type HeroStat = {
  value: string;
  label: string;
};

const statIcons = [Users, BookOpen, Star];

function getMobileCtaText(label?: string) {
  const fallback = "Courses";
  if (!label?.trim()) {
    return fallback;
  }

  const normalized = label.trim();
  if (/explore/i.test(normalized) && /course/i.test(normalized)) {
    return "Courses";
  }

  if (normalized.length <= 12) {
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
  globalInterval = 6,
}: {
  slides: HeroSlide[];
  stats: HeroStat[];
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
  const learnerStat = stats[0] ?? null;
  const lowerStats = stats.slice(1, 3);

  useEffect(() => {
    if (paused || slideCount <= 1) {
      return;
    }

    const timer = window.setInterval(next, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, next, paused, slideCount]);

  if (slideCount === 0) {
    return null;
  }

  return (
    <section
      className="relative overflow-hidden [min-height:38rem] sm:[min-height:42rem] lg:[min-height:calc(100svh-var(--announcement-height)-var(--navbar-height)-var(--mobile-bottom-nav-height))] lg:[height:calc(100dvh-var(--announcement-height)-var(--navbar-height)-var(--mobile-bottom-nav-height))]"
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
            quality={75}
            placeholder="blur"
            blurDataURL={IMAGE_BLUR_DATA_URL}
            className="object-cover object-[58%_center] sm:object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,86,210,0.28),transparent_42%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/92 via-[#020617]/76 to-[#020617]/42" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/72 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-between px-4 pb-6 pt-8 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        <div className="flex min-h-0 flex-1 items-start pt-4 sm:items-center sm:pt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-copy-${current}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.42 }}
              className="w-full max-w-3xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm sm:text-xs">
                <Sparkles className="h-3.5 w-3.5 text-white" />
                {currentSlide.subtitle || "Master LLM Engineering"}
              </div>

              <h1 className="mt-4 max-w-2xl text-[2.35rem] font-black leading-[0.95] text-white sm:mt-5 sm:text-[3.2rem] lg:max-w-3xl lg:text-[4.35rem]">
                {currentSlide.title}
              </h1>

              {currentSlide.description ? (
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white sm:mt-5 sm:text-base sm:leading-7 lg:text-lg">
                  {currentSlide.description}
                </p>
              ) : null}

              <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
                <div className="hide-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:gap-3">
                  <Link
                    href={currentSlide.ctaLink || "/courses"}
                    className="group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary-blue px-3.5 py-2 text-xs font-semibold text-white shadow-[0_22px_50px_-28px_rgba(0,86,210,0.9)] transition hover:bg-primary-blue/90 sm:px-5 sm:py-3 sm:text-sm"
                  >
                    <span className="sm:hidden">{getMobileCtaText(currentSlide.ctaText || "Explore LLM Courses")}</span>
                    <span className="hidden sm:inline">{getPrimaryCtaText(currentSlide.ctaText || "Explore LLM Courses")}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  {learnerStat ? (
                    <HeroStatPill stat={learnerStat} iconIndex={0} />
                  ) : null}
                </div>

                <div className="hide-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:gap-3">
                  {lowerStats.map((stat, index) => (
                    <HeroStatPill key={stat.label} stat={stat} iconIndex={index + 1} />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
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

function HeroStatPill({ stat, iconIndex }: { stat: HeroStat; iconIndex: number }) {
  const Icon = statIcons[iconIndex] ?? Sparkles;

  return (
    <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-white backdrop-blur-sm sm:px-4 sm:py-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 sm:h-8 sm:w-8">
        <Icon className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
      </div>
      <div className="flex items-baseline gap-1.5 whitespace-nowrap">
        <p className="text-sm font-black leading-none text-white sm:text-base">{stat.value}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/88 sm:text-[11px]">
          {stat.label}
        </p>
      </div>
    </div>
  );
}
