"use client";

import { startTransition, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FolderTree, PencilLine, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { removeCourseFromCategoryAction } from "@/app/admin/actions";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageIntro,
  AdminSelect,
  EmptyState,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";
import { formatPrice } from "@/lib/utils";

type CategoryCourseRow = {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl?: string | null;
  instructorName?: string | null;
  isPublished: boolean;
  price: number;
  currency?: string | null;
  enrollments: number;
};

const thumbnailFallback =
  "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=340&fit=crop";

export function CategoryCoursesView({
  category,
  courses,
}: {
  category: {
    id: string;
    name: string;
    slug: string;
    courseCount: number;
  };
  courses: CategoryCourseRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesQuery =
        !query ||
        course.title.toLowerCase().includes(query) ||
        course.slug.toLowerCase().includes(query) ||
        course.instructorName?.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PUBLISHED" ? course.isPublished : !course.isPublished);

      return matchesQuery && matchesStatus;
    });
  }, [courses, search, statusFilter]);

  function handleRemove(courseId: string) {
    setBusyCourseId(courseId);
    startTransition(async () => {
      const result = await removeCourseFromCategoryAction({
        categoryId: category.id,
        courseId,
      });
      setBusyCourseId(null);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <Link href="/admin/categories" className="transition-colors hover:text-white">
          Categories
        </Link>
        <span>&gt;</span>
        <span className="text-slate-200">{category.name}</span>
        <span>&gt;</span>
        <span className="text-white">Courses</span>
      </div>

      <AdminPageIntro
        eyebrow="Category Drill-Down"
        title={`${category.name} Courses`}
        description="Review every course assigned to this category, search within the category, and jump straight into edits or reassignment."
        actions={
          <Link href="/admin/courses">
            <AdminButton type="button" variant="secondary">
              Assign Courses
            </AdminButton>
          </Link>
        }
      />

      <AdminCard className="p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <AdminInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search within ${category.name}`}
              className="pl-11"
            />
          </div>
          <AdminSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "ALL" | "PUBLISHED" | "DRAFT")}
          >
            <option value="ALL">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </AdminSelect>
        </div>
      </AdminCard>

      {courses.length === 0 ? (
        <EmptyState
          title="No courses assigned yet"
          description="This category is ready, but nothing is mapped into it yet. Assign courses to make the taxonomy useful across the storefront and admin filters."
          action={
            <Link href="/admin/courses">
              <AdminButton type="button">Assign Courses</AdminButton>
            </Link>
          }
        />
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          title="No matching courses"
          description="Try a different keyword or switch the status filter to broaden the list."
          action={
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
            >
              Reset Filters
            </AdminButton>
          }
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  {["Course", "Status", "Price", "Enrollments", "Actions"].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="align-top hover:bg-white/[0.02]">
                    <td className="px-5 py-5">
                      <div className="flex items-start gap-4">
                        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                          <Image
                            src={course.thumbnailUrl || thumbnailFallback}
                            alt={course.title}
                            fill
                            sizes="128px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-base font-semibold text-white">{course.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                            {course.slug}
                          </p>
                          <p className="mt-2 text-sm text-slate-400">
                            {course.instructorName || "Instructor unavailable"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <StatusPill tone={course.isPublished ? "success" : "warning"}>
                        {course.isPublished ? "Published" : "Draft"}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-5 text-sm font-semibold text-white">
                      {course.price === 0 ? "Free" : formatPrice(course.price, course.currency || "USD")}
                    </td>
                    <td className="px-5 py-5 text-sm text-slate-300">{course.enrollments}</td>
                    <td className="px-5 py-5">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/courses?edit=${course.id}`}>
                          <AdminButton type="button" variant="secondary" icon={<PencilLine className="h-4 w-4" />}>
                            Edit
                          </AdminButton>
                        </Link>
                        <AdminButton
                          type="button"
                          variant="ghost"
                          busy={busyCourseId === course.id}
                          icon={<Trash2 className="h-4 w-4 text-rose-300" />}
                          onClick={() => handleRemove(course.id)}
                          disabled={category.slug === "uncategorized"}
                        >
                          Remove from category
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      <AdminCard className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
            <FolderTree className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{filteredCourses.length} course(s) shown</p>
            <p className="text-sm text-slate-400">
              {category.courseCount} total currently assigned to {category.name}.
            </p>
          </div>
        </div>
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary-blue transition-colors hover:text-white"
        >
          Manage full catalog
          <ArrowRight className="h-4 w-4" />
        </Link>
      </AdminCard>
    </div>
  );
}
