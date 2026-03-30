"use client";

import { useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CourseCard } from "@/components/courses/CourseCard";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category, Course, Level } from "@/types";

const levels: { value: Level | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Levels" },
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
];

const sortOptions = [
  { value: "popular", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
];

const inputClass =
  "rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20";

type SpecialFilter = "all" | "featured" | "trending" | "new";

function normalizeSpecialFilter(value?: string): SpecialFilter {
  if (value === "featured" || value === "trending" || value === "new") {
    return value;
  }

  return "all";
}

export function CoursesCatalog({
  courses,
  categories,
  initialCategory = "all",
  initialFilter,
}: {
  courses: Course[];
  categories: Category[];
  initialCategory?: string;
  initialFilter?: string;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [level, setLevel] = useState<Level | "ALL">("ALL");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [specialFilter, setSpecialFilter] = useState<SpecialFilter>(normalizeSpecialFilter(initialFilter));
  const [sort, setSort] = useState(initialFilter === "popular" ? "popular" : "popular");

  const filtered = useMemo(() => {
    let filteredCourses = [...courses];

    if (specialFilter === "featured") {
      filteredCourses = filteredCourses.filter((course) => course.isFeatured);
    }

    if (specialFilter === "trending") {
      filteredCourses = filteredCourses.filter((course) => course.isTrending);
    }

    if (specialFilter === "new") {
      filteredCourses = filteredCourses.filter((course) => course.isNew);
    }

    if (search) {
      const query = search.toLowerCase();
      filteredCourses = filteredCourses.filter(
        (course) =>
          course.title.toLowerCase().includes(query) ||
          course.description.toLowerCase().includes(query) ||
          course.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (category !== "all") {
      const categoryId = categories.find((entry) => entry.slug === category)?.id;
      filteredCourses = filteredCourses.filter((course) => course.categoryId === categoryId);
    }

    if (level !== "ALL") {
      filteredCourses = filteredCourses.filter((course) => course.level === level);
    }

    if (priceFilter === "free") {
      filteredCourses = filteredCourses.filter((course) => course.isFree);
    }

    if (priceFilter === "paid") {
      filteredCourses = filteredCourses.filter((course) => !course.isFree);
    }

    switch (sort) {
      case "popular":
        filteredCourses.sort((left, right) => right.totalStudents - left.totalStudents);
        break;
      case "rating":
        filteredCourses.sort((left, right) => right.rating - left.rating);
        break;
      case "newest":
        filteredCourses.sort((left, right) => Number(right.isNew) - Number(left.isNew));
        break;
      case "price-low":
        filteredCourses.sort((left, right) => left.price - right.price);
        break;
      case "price-high":
        filteredCourses.sort((left, right) => right.price - left.price);
        break;
    }

    return filteredCourses;
  }, [category, categories, courses, level, priceFilter, search, sort, specialFilter]);

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setLevel("ALL");
    setPriceFilter("all");
    setSpecialFilter("all");
    setSort("popular");
  };

  const hasFilters =
    Boolean(search) ||
    category !== "all" ||
    level !== "ALL" ||
    priceFilter !== "all" ||
    specialFilter !== "all";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20">
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="mb-2 text-3xl font-black text-foreground">
              All <span className="text-blue-600">AI Courses</span>
            </h1>
            <p className="text-muted-foreground">
              {filtered.length} course{filtered.length !== 1 ? "s" : ""} - learn from the world&apos;s best AI instructors
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] max-w-sm flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search courses..."
                className={cn(inputClass, "pl-10")}
              />
            </div>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={cn(inputClass, "cursor-pointer")}
            >
              <option value="all">All Categories</option>
              {categories.map((entry) => (
                <option key={entry.id} value={entry.slug}>
                  {entry.name}
                </option>
              ))}
            </select>

            <select
              value={level}
              onChange={(event) => setLevel(event.target.value as Level | "ALL")}
              className={cn(inputClass, "cursor-pointer")}
            >
              {levels.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
              {(["all", "free", "paid"] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setPriceFilter(value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    priceFilter === value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {value}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className={cn(inputClass, "cursor-pointer")}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2.5 text-xs text-rose-600 transition-colors hover:border-rose-300 hover:text-rose-700 dark:border-rose-800 dark:text-rose-400 dark:hover:border-rose-700 dark:hover:text-rose-300"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="py-24 text-center">
              <div className="mb-4 text-6xl">AI</div>
              <h3 className="mb-2 text-xl font-bold text-foreground">No courses found</h3>
              <p className="mb-6 text-muted-foreground">Try adjusting your filters or search term.</p>
              <button
                onClick={clearFilters}
                className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-3 text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-950/60"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
