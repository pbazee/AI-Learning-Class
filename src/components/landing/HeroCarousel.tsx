"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Sparkles, Users, Star, BookOpen } from "lucide-react";
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
      className="relative min-h-[600px] overflow-hidden"
      style={{ paddingTop: "4rem" }}
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
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Dark overlay so text is readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-blue-950/75 to-blue-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-950/70 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {slide.subtitle && (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-blue-100 ring-1 ring-white/20 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  <span>{slide.subtitle}</span>
                </div>
              )}

              <h1 className="text-4xl font-black leading-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
                {slide.title}
              </h1>

              {slide.description && (
                <p className="max-w-2xl text-lg leading-relaxed text-blue-100/90">
                  {slide.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href={slide.ctaLink || "/courses"}
                  className="group inline-flex items-center gap-3 rounded-2xl bg-white px-7 py-4 text-base font-semibold text-blue-700 shadow-[0_20px_40px_rgba(0,40,128,0.3)] hover:bg-blue-50 transition-all"
                >
                  {slide.ctaText || "Explore Courses"}
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <button className="group inline-flex items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-6 py-4 font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-all group-hover:bg-white/30">
                    <Play className="ml-0.5 h-4 w-4" />
                  </div>
                  Watch Demo
                </button>
              </div>

              {averageRating && (
                <div className="flex items-center gap-2 text-yellow-300">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="font-bold text-white">{averageRating}</span>
                  <span className="text-blue-200/80 text-sm">average rating</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Stats row */}
          {stats.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-6">
              {stats.map(({ value, label }, index) => {
                const Icon = statIcons[index] ?? Sparkles;
                return (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-white leading-none">{value}</div>
                      <div className="mt-0.5 text-xs text-blue-100/70">{label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navigation controls */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4">
        <button
          onClick={prev}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/25 transition-all"
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/25 transition-all"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
