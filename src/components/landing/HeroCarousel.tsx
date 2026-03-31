"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Users, Star, BookOpen } from "lucide-react";
import type { HeroSlide } from "@/types";

type HeroStat = {
  value: string;
  label: string;
};

const statIcons = [Users, BookOpen, Star];

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
    if (slideCount === 0) return;
    setCurrent((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const prev = useCallback(() => {
    if (slideCount === 0) return;
    setCurrent((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  const currentSlide = slides[current] ?? slides[0];
  const intervalMs = ((currentSlide?.autoSlideInterval ?? globalInterval) || 6) * 1000;

  useEffect(() => {
    if (paused || slideCount <= 1) return;
    const timer = setInterval(next, intervalMs);
    return () => clearInterval(timer);
  }, [next, paused, slideCount, intervalMs]);

  if (slideCount === 0) return null;

  const slide = slides[current] ?? slides[0];

  return (
    <section
      className="relative min-h-[640px] overflow-hidden sm:h-[calc(100svh-var(--announcement-height)-var(--navbar-height))]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Full-background image */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`bg-${current}`}
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
        >
          <Image
            src={slide.imageUrl}
            alt={slide.title}
            fill
            quality={100}
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Dark overlay so text is readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/56 to-black/28" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 pb-28 pt-16 sm:px-6 sm:pb-28 lg:px-8">
        <div className="max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-5"
            >
              {slide.subtitle && (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm sm:text-sm">
                  <Sparkles className="h-4 w-4 text-white" />
                  <span>{slide.subtitle}</span>
                </div>
              )}

              <h1 className="text-4xl font-black leading-[0.95] text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
                {slide.title}
              </h1>

              {slide.description && (
                <p className="max-w-2xl text-base leading-relaxed text-white/88 sm:text-lg">
                  {slide.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1 sm:gap-4">
                <Link
                  href={slide.ctaLink || "/courses"}
                  className="group inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-primary-blue shadow-[0_20px_40px_rgba(15,23,42,0.3)] transition-all hover:bg-white/95 sm:w-auto sm:px-7 sm:text-base"
                >
                  {slide.ctaText || "Explore Courses"}
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {averageRating && (
                <div className="flex items-center gap-2 text-yellow-300">
                  <Star className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
                  <span className="font-bold text-white">{averageRating}</span>
                  <span className="text-white/75 text-sm">average rating</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Stats row */}
          {stats.length > 0 && (
            <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
              {stats.map(({ value, label }, index) => {
                const Icon = statIcons[index] ?? Sparkles;
                return (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-white leading-none">{value}</div>
                      <div className="mt-0.5 text-xs text-white/70">{label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navigation controls */}
      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 sm:bottom-6 sm:gap-4">
        <button
          onClick={prev}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/25 sm:h-10 sm:w-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`rounded-full transition-all ${
                index === current ? "h-2.5 w-10 bg-white" : "h-2.5 w-2.5 bg-white/40"
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/25 sm:h-10 sm:w-10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
