"use client";

import { startTransition, useMemo, useState } from "react";
import { ChevronDown, Edit3, FileAudio, FileText, FileVideo, Filter, Search, Trash2, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteCourseAction, deleteCourseAssetAction, saveCourseAction, saveCourseAssetAction } from "@/app/admin/actions";
import { CourseBulkImportModal } from "@/components/admin/course-bulk-import-modal";
import {
  CourseStructureBuilder,
  createEmptySection,
  normalizeLessonType,
  type CourseSectionDraft,
} from "@/components/admin/course-structure-builder";
import { MediaUploader, type UploadedAsset } from "@/components/admin/media-uploader";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminModal,
  AdminPageIntro,
  AdminSelect,
  AdminStatCard,
  AdminStatGrid,
  AdminSwitch,
  AdminTextarea,
  CreateButton,
  EmptyState,
  FieldLabel,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/toaster";
import { formatPrice, levelLabel } from "@/lib/utils";

type CourseAssetRow = {
  id: string;
  type: "AUDIO" | "VIDEO" | "PDF";
  title: string;
  fileName: string;
  url: string;
  storagePath: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

type CourseLessonRow = {
  id: string;
  title: string;
  description?: string | null;
  type: "VIDEO" | "AUDIO" | "PDF" | "TEXT" | "QUIZ" | "ASSIGNMENT" | "PROJECT" | "LIVE";
  assetUrl?: string | null;
  assetPath?: string | null;
  duration?: number | null;
  content?: string | null;
  isPreview: boolean;
  allowDownload: boolean;
  sellSeparately: boolean;
  order: number;
};

type CourseSectionRow = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  lessons: CourseLessonRow[];
};

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  categoryId: string;
  categoryName: string;
  instructorId: string;
  instructorName: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";
  price: number;
  isFree: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isRecommended: boolean;
  isNew: boolean;
  thumbnailUrl?: string | null;
  thumbnailPath?: string | null;
  language: string;
  totalStudents: number;
  rating: number;
  tags: string[];
  whatYouLearn: string[];
  requirements: string[];
  assets: CourseAssetRow[];
  curriculum: CourseSectionRow[];
  hasSubscriptionAccess: boolean;
};

type CourseFormState = {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  instructorId: string;
  level: CourseRow["level"];
  price: number;
  status: "DRAFT" | "PUBLISHED";
  isFeatured: boolean;
  isTrending: boolean;
  isRecommended: boolean;
  isFree: boolean;
  isNew: boolean;
  thumbnailUrl: string;
  thumbnailPath: string;
  language: string;
  tagsText: string;
  whatYouLearnText: string;
  requirementsText: string;
  curriculum: CourseSectionDraft[];
};

type StatusFilter = "ALL" | "PUBLISHED" | "DRAFT" | "FEATURED" | "TRENDING" | "RECOMMENDED";
type PriceFilter = "ALL" | "FREE" | "PAID" | "SUBSCRIPTION";
type LevelFilter = "ALL" | CourseRow["level"];

function toLines(values: string[]) {
  return values.join("\n");
}

function fromLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getAssetIcon(type: CourseAssetRow["type"]) {
  if (type === "AUDIO") return FileAudio;
  if (type === "VIDEO") return FileVideo;
  return FileText;
}

function getClientErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function buildEmptyForm(
  categoryOptions: Array<{ label: string; value: string }>,
  instructorOptions: Array<{ label: string; value: string }>
): CourseFormState {
  return {
    id: "",
    title: "",
    slug: "",
    description: "",
    shortDescription: "",
    categoryId: categoryOptions[0]?.value || "",
    instructorId: instructorOptions[0]?.value || "",
    level: "BEGINNER",
    price: 0,
    status: "DRAFT",
    isFeatured: false,
    isTrending: false,
    isRecommended: false,
    isFree: false,
    isNew: true,
    thumbnailUrl: "",
    thumbnailPath: "",
    language: "English",
    tagsText: "",
    whatYouLearnText: "",
    requirementsText: "",
    curriculum: [createEmptySection()],
  };
}

function mapCourseToForm(course: CourseRow): CourseFormState {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    shortDescription: course.shortDescription || "",
    categoryId: course.categoryId,
    instructorId: course.instructorId,
    level: course.level,
    price: course.price,
    status: course.isPublished ? "PUBLISHED" : "DRAFT",
    isFeatured: course.isFeatured,
    isTrending: course.isTrending,
    isRecommended: course.isRecommended,
    isFree: course.isFree,
    isNew: course.isNew,
    thumbnailUrl: course.thumbnailUrl || "",
    thumbnailPath: course.thumbnailPath || "",
    language: course.language,
    tagsText: toLines(course.tags),
    whatYouLearnText: toLines(course.whatYouLearn),
    requirementsText: toLines(course.requirements),
    curriculum:
      course.curriculum.length > 0
        ? course.curriculum
            .sort((left, right) => left.order - right.order)
            .map((section) => ({
              id: section.id,
              localId: `${section.id}-${section.order}`,
              title: section.title,
              description: section.description || "",
              isExpanded: true,
              lessons: section.lessons
                .sort((left, right) => left.order - right.order)
                .map((lesson) => ({
                  id: lesson.id,
                  localId: `${lesson.id}-${lesson.order}`,
                  title: lesson.title,
                  description: lesson.description || "",
                  type: lesson.type,
                  assetUrl: lesson.assetUrl || "",
                  assetPath: lesson.assetPath || "",
                  durationMinutes: lesson.duration ? String(Math.max(1, Math.round(lesson.duration / 60))) : "",
                  content: lesson.content || "",
                  isPreview: lesson.isPreview,
                  allowDownload: lesson.allowDownload,
                  sellSeparately: lesson.sellSeparately,
                  isExpanded: false,
                })),
            }))
        : [createEmptySection()],
  };
}

export function CoursesManager({
  courses,
  categoryOptions,
  instructorOptions,
}: {
  courses: CourseRow[];
  categoryOptions: Array<{ label: string; value: string }>;
  instructorOptions: Array<{ label: string; value: string }>;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "structure" | "downloads">("details");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("ALL");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [form, setForm] = useState<CourseFormState>(() => buildEmptyForm(categoryOptions, instructorOptions));
  const [assetDraft, setAssetDraft] = useState({
    title: "",
    type: "VIDEO" as "AUDIO" | "VIDEO" | "PDF",
  });
  const router = useRouter();
  const { toast } = useToast();

  function openCreate() {
    setForm(buildEmptyForm(categoryOptions, instructorOptions));
    setAssetDraft({ title: "", type: "VIDEO" });
    setActiveTab("details");
    setEditorOpen(true);
  }

  function openEdit(course: CourseRow) {
    setForm(mapCourseToForm(course));
    setAssetDraft({ title: "", type: "VIDEO" });
    setActiveTab("details");
    setEditorOpen(true);
  }

  function handleSave() {
    setBusy(true);
    startTransition(async () => {
      try {
        const result = await saveCourseAction({
          id: form.id || undefined,
          title: form.title,
          slug: form.slug,
          description: form.description,
          shortDescription: form.shortDescription,
          categoryId: form.categoryId,
          instructorId: form.instructorId,
          level: form.level,
          language: form.language,
          price: Number(form.price),
          status: form.status,
          isFeatured: form.isFeatured,
          isTrending: form.isTrending,
          isRecommended: form.isRecommended,
          isFree: form.isFree,
          isNew: form.isNew,
          thumbnailUrl: form.thumbnailUrl,
          thumbnailPath: form.thumbnailPath,
          tags: fromLines(form.tagsText),
          whatYouLearn: fromLines(form.whatYouLearnText),
          requirements: fromLines(form.requirementsText),
          curriculum: form.curriculum.map((section, sectionIndex) => ({
            id: section.id || undefined,
            title: section.title,
            description: section.description,
            order: sectionIndex,
            lessons: section.lessons.map((lesson, lessonIndex) => ({
              id: lesson.id || undefined,
              title: lesson.title,
              description: lesson.description,
              type: normalizeLessonType(lesson.type) as "VIDEO" | "AUDIO" | "PDF" | "QUIZ" | "ASSIGNMENT" | "TEXT" | "PROJECT" | "LIVE",
              assetUrl: lesson.assetUrl,
              assetPath: lesson.assetPath,
              duration: lesson.durationMinutes ? Number(lesson.durationMinutes) * 60 : undefined,
              content: lesson.content,
              isPreview: lesson.isPreview,
              allowDownload: lesson.allowDownload,
              sellSeparately: lesson.sellSeparately,
              order: lessonIndex,
            })),
          })),
        });

        toast(result.message, result.success ? "success" : "error");
        if (result.success) {
          setEditorOpen(false);
          router.refresh();
        }
      } catch (error) {
        toast(getClientErrorMessage(error), "error");
      } finally {
        setBusy(false);
      }
    });
  }

  function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this course, its curriculum, and uploaded assets?");
    if (!confirmed) return;

    setBusy(true);
    startTransition(async () => {
      try {
        const result = await deleteCourseAction(id);
        toast(result.message, result.success ? "success" : "error");
        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        toast(getClientErrorMessage(error), "error");
      } finally {
        setBusy(false);
      }
    });
  }

  function handleDeleteAsset(id: string) {
    const confirmed = window.confirm("Delete this uploaded course asset?");
    if (!confirmed) return;

    setBusy(true);
    startTransition(async () => {
      try {
        const result = await deleteCourseAssetAction(id);
        toast(result.message, result.success ? "success" : "error");
        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        toast(getClientErrorMessage(error), "error");
      } finally {
        setBusy(false);
      }
    });
  }

  function handleAssetUploaded(file: UploadedAsset) {
    if (!form.id) {
      toast("Save the course first, then upload downloadable assets.", "error");
      return;
    }

    setBusy(true);
    startTransition(async () => {
      try {
        const result = await saveCourseAssetAction({
          courseId: form.id,
          type: assetDraft.type,
          title: assetDraft.title || file.fileName,
          fileName: file.fileName,
          storagePath: file.path,
          url: file.url,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          order: 0,
        });
        toast(result.message, result.success ? "success" : "error");
        if (result.success) {
          setAssetDraft({ title: "", type: "VIDEO" });
          router.refresh();
        }
      } catch (error) {
        toast(getClientErrorMessage(error), "error");
      } finally {
        setBusy(false);
      }
    });
  }

  const activeCourse = courses.find((course) => course.id === form.id);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const searchMatch = !search || course.title.toLowerCase().includes(search.toLowerCase());
      const statusMatch =
        statusFilter === "ALL"
          ? true
          : statusFilter === "PUBLISHED"
            ? course.isPublished
            : statusFilter === "DRAFT"
              ? !course.isPublished
              : statusFilter === "FEATURED"
                ? course.isFeatured
                : statusFilter === "TRENDING"
                  ? course.isTrending
                  : course.isRecommended;
      const categoryMatch =
        selectedCategories.length === 0 || selectedCategories.includes(course.categoryId);
      const priceMatch =
        priceFilter === "ALL"
          ? true
          : priceFilter === "FREE"
            ? course.isFree
            : priceFilter === "PAID"
              ? !course.isFree
              : course.hasSubscriptionAccess;
      const levelMatch = levelFilter === "ALL" ? true : course.level === levelFilter;

      return searchMatch && statusMatch && categoryMatch && priceMatch && levelMatch;
    });
  }, [courses, levelFilter, priceFilter, search, selectedCategories, statusFilter]);

  const courseStats = {
    total: courses.length,
    published: courses.filter((course) => course.isPublished).length,
    draft: courses.filter((course) => !course.isPublished).length,
    featured: courses.filter((course) => course.isFeatured).length,
    trending: courses.filter((course) => course.isTrending).length,
    free: courses.filter((course) => course.isFree).length,
    recommended: courses.filter((course) => course.isRecommended).length,
  };

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Catalog"
        title="Courses"
        description="Launch premium courses, shape the curriculum, and manage catalog performance with fast filtering and imports."
        actions={
          <>
            <AdminButton type="button" variant="secondary" icon={<UploadCloud className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
              Bulk Import Courses
            </AdminButton>
            <CreateButton onClick={openCreate}>New Course</CreateButton>
          </>
        }
      />

      <AdminStatGrid>
        <AdminStatCard label="Total Courses" value={courseStats.total} />
        <AdminStatCard label="Published" value={courseStats.published} accent="from-emerald-500 to-teal-400" />
        <AdminStatCard label="Draft Courses" value={courseStats.draft} accent="from-slate-500 to-slate-300" />
        <AdminStatCard label="Featured" value={courseStats.featured} accent="from-amber-500 to-orange-400" />
        <AdminStatCard label="Trending" value={courseStats.trending} accent="from-cyan-500 to-blue-400" />
        <AdminStatCard label="Free" value={courseStats.free} accent="from-violet-500 to-fuchsia-400" />
        <AdminStatCard label="Recommended" value={courseStats.recommended} accent="from-pink-500 to-rose-400" />
      </AdminStatGrid>

      <AdminCard className="p-5">
        <div className="grid gap-4 xl:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
          <div className="xl:col-span-1">
            <FieldLabel>Search Courses</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <AdminInput
                className="pl-11"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by course title"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Status</FieldLabel>
            <AdminSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="ALL">All</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="FEATURED">Featured</option>
              <option value="TRENDING">Trending</option>
              <option value="RECOMMENDED">Recommended</option>
            </AdminSelect>
          </div>

          <div className="relative">
            <FieldLabel>Category</FieldLabel>
            <button
              type="button"
              onClick={() => setCategoryFilterOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-100"
            >
              <span className="truncate">
                {selectedCategories.length === 0
                  ? "All categories"
                  : `${selectedCategories.length} selected`}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>

            {categoryFilterOpen ? (
              <div className="absolute z-20 mt-2 w-full rounded-2xl border border-white/10 bg-[#070b12] p-3 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Categories
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedCategories([])}
                    className="text-xs font-medium text-blue-300 hover:text-blue-200"
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {categoryOptions.map((category) => {
                    const selected = selectedCategories.includes(category.value);

                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() =>
                          setSelectedCategories((current) =>
                            selected
                              ? current.filter((value) => value !== category.value)
                              : [...current, category.value]
                          )
                        }
                        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
                      >
                        <span>{category.label}</span>
                        {selected ? <StatusPill tone="info">Selected</StatusPill> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <FieldLabel>Price</FieldLabel>
            <AdminSelect value={priceFilter} onChange={(event) => setPriceFilter(event.target.value as PriceFilter)}>
              <option value="ALL">All pricing</option>
              <option value="FREE">Free</option>
              <option value="PAID">Paid</option>
              <option value="SUBSCRIPTION">Subscription</option>
            </AdminSelect>
          </div>

          <div>
            <FieldLabel>Level</FieldLabel>
            <AdminSelect value={levelFilter} onChange={(event) => setLevelFilter(event.target.value as LevelFilter)}>
              <option value="ALL">All levels</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </AdminSelect>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <Filter className="h-4 w-4" />
            <span>{filteredCourses.length} course(s) match the active filters</span>
          </div>

          {(search || statusFilter !== "ALL" || priceFilter !== "ALL" || levelFilter !== "ALL" || selectedCategories.length > 0) ? (
            <AdminButton
              type="button"
              variant="ghost"
              icon={<X className="h-4 w-4" />}
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setPriceFilter("ALL");
                setLevelFilter("ALL");
                setSelectedCategories([]);
              }}
            >
              Reset Filters
            </AdminButton>
          ) : null}
        </div>
      </AdminCard>

      {filteredCourses.length === 0 ? (
        <EmptyState
          title="No courses match the current filters"
          description="Try widening the filters, importing a batch, or creating a new course."
          action={<CreateButton onClick={openCreate}>Create Course</CreateButton>}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  {["Course", "Category", "Level", "Price", "Students", "Curriculum", "Status", "Actions"].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-white">{course.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {course.instructorName} • {course.hasSubscriptionAccess ? "Included in subscriptions" : "Standalone only"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{course.categoryName}</td>
                    <td className="px-4 py-4 text-slate-300">{levelLabel(course.level)}</td>
                    <td className="px-4 py-4 font-semibold text-white">
                      {course.isFree ? "Free" : formatPrice(course.price)}
                    </td>
                    <td className="px-4 py-4 text-slate-300">{course.totalStudents}</td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">{course.curriculum.length} sections</p>
                        <p className="text-xs text-slate-400">
                          {course.curriculum.reduce((sum, section) => sum + section.lessons.length, 0)} lessons • {course.assets.length} downloads
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone={course.isPublished ? "success" : "neutral"}>
                          {course.isPublished ? "Published" : "Draft"}
                        </StatusPill>
                        {course.isFeatured ? <StatusPill tone="warning">Featured</StatusPill> : null}
                        {course.isTrending ? <StatusPill tone="info">Trending</StatusPill> : null}
                        {course.isRecommended ? <StatusPill tone="info">Recommended</StatusPill> : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <AdminButton
                          type="button"
                          variant="ghost"
                          icon={<Edit3 className="h-4 w-4" />}
                          onClick={() => openEdit(course)}
                        >
                          Edit
                        </AdminButton>
                        <AdminButton
                          type="button"
                          variant="ghost"
                          icon={<Trash2 className="h-4 w-4" />}
                          onClick={() => handleDelete(course.id)}
                        >
                          Delete
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

      <AdminModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={form.id ? "Course Editor" : "Create Course"}
        description="Configure the course details, build the curriculum, and manage supplemental downloads from one workspace."
        size="xl"
        footer={
          <div className="flex flex-wrap justify-between gap-3">
            <div className="flex gap-2">
              {(["details", "structure", "downloads"] as const).map((tab) => (
                <AdminButton
                  key={tab}
                  type="button"
                  variant={activeTab === tab ? "primary" : "secondary"}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "details" ? "Details" : tab === "structure" ? "Course Structure" : "Course Assets"}
                </AdminButton>
              ))}
            </div>
            <div className="flex gap-3">
              <AdminButton type="button" variant="secondary" onClick={() => setEditorOpen(false)}>
                Cancel
              </AdminButton>
              <AdminButton type="button" busy={busy} onClick={handleSave}>
                Save Course
              </AdminButton>
            </div>
          </div>
        }
      >
        {activeTab === "details" ? (
          <div className="grid gap-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldLabel>Course Title</FieldLabel>
                <AdminInput value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div>
                <FieldLabel>Slug</FieldLabel>
                <AdminInput
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="leave blank to auto-generate"
                />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <AdminSelect
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as "DRAFT" | "PUBLISHED" }))}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </AdminSelect>
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Description</FieldLabel>
                <AdminTextarea rows={5} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Short Description</FieldLabel>
                <AdminTextarea rows={3} value={form.shortDescription} onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))} />
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <AdminSelect value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <div>
                <FieldLabel>Instructor</FieldLabel>
                <AdminSelect value={form.instructorId} onChange={(event) => setForm((current) => ({ ...current, instructorId: event.target.value }))}>
                  {instructorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <div>
                <FieldLabel>Level</FieldLabel>
                <AdminSelect value={form.level} onChange={(event) => setForm((current) => ({ ...current, level: event.target.value as CourseRow["level"] }))}>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="ALL_LEVELS">All Levels</option>
                </AdminSelect>
              </div>
              <div>
                <FieldLabel>Language</FieldLabel>
                <AdminInput value={form.language} onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))} />
              </div>
              <div>
                <FieldLabel>Price</FieldLabel>
                <AdminInput type="number" step="0.01" value={String(form.price)} onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))} />
              </div>
              <div className="grid gap-3">
                <AdminSwitch checked={form.isFree} onChange={(value) => setForm((current) => ({ ...current, isFree: value }))} label="Free Course" />
                <AdminSwitch checked={form.isFeatured} onChange={(value) => setForm((current) => ({ ...current, isFeatured: value }))} label="Featured" />
                <AdminSwitch checked={form.isTrending} onChange={(value) => setForm((current) => ({ ...current, isTrending: value }))} label="Trending" />
                <AdminSwitch checked={form.isRecommended} onChange={(value) => setForm((current) => ({ ...current, isRecommended: value }))} label="Recommended" />
                <AdminSwitch checked={form.isNew} onChange={(value) => setForm((current) => ({ ...current, isNew: value }))} label="Mark as New" />
              </div>
              <div className="md:col-span-2">
                <MediaUploader
                  label="Thumbnail"
                  hint="Upload the main course card image."
                  folder="courses/thumbnails"
                  accept="image/*"
                  value={{
                    url: form.thumbnailUrl,
                    path: form.thumbnailPath,
                    fileName: form.title || "Course thumbnail",
                    mimeType: "image/*",
                  }}
                  onUploaded={(file) => setForm((current) => ({ ...current, thumbnailUrl: file.url, thumbnailPath: file.path }))}
                  onRemoved={() => setForm((current) => ({ ...current, thumbnailUrl: "", thumbnailPath: "" }))}
                />
              </div>
              <div>
                <FieldLabel>Tags</FieldLabel>
                <AdminTextarea rows={4} value={form.tagsText} onChange={(event) => setForm((current) => ({ ...current, tagsText: event.target.value }))} placeholder="One per line" />
              </div>
              <div>
                <FieldLabel>What Learners Will Achieve</FieldLabel>
                <AdminTextarea rows={4} value={form.whatYouLearnText} onChange={(event) => setForm((current) => ({ ...current, whatYouLearnText: event.target.value }))} placeholder="One per line" />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Requirements</FieldLabel>
                <AdminTextarea rows={4} value={form.requirementsText} onChange={(event) => setForm((current) => ({ ...current, requirementsText: event.target.value }))} placeholder="One per line" />
              </div>
            </div>
          </div>
        ) : activeTab === "structure" ? (
          <CourseStructureBuilder
            courseId={form.id || undefined}
            sections={form.curriculum}
            onChange={(curriculum) => setForm((current) => ({ ...current, curriculum }))}
          />
        ) : (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-black text-white">Course Assets</h3>
              <p className="mt-1 text-sm text-slate-400">
                Upload supplemental downloads that sit alongside the lesson curriculum.
              </p>
            </div>

            {!form.id ? (
              <AdminCard className="border-dashed p-6">
                <p className="text-sm text-slate-400">Save the course first to unlock the supplemental asset manager.</p>
              </AdminCard>
            ) : (
              <>
                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <FieldLabel>Asset Type</FieldLabel>
                    <AdminSelect value={assetDraft.type} onChange={(event) => setAssetDraft((current) => ({ ...current, type: event.target.value as CourseAssetRow["type"] }))}>
                      <option value="VIDEO">Video</option>
                      <option value="AUDIO">Audio</option>
                      <option value="PDF">PDF</option>
                    </AdminSelect>
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>Asset Title</FieldLabel>
                    <AdminInput value={assetDraft.title} onChange={(event) => setAssetDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Introduction PDF" />
                  </div>
                  <div className="md:col-span-3">
                    <MediaUploader
                      label="Upload Asset"
                      hint="The file will attach immediately after upload."
                      folder={`courses/assets/${form.id}`}
                      accept="audio/*,video/*,application/pdf"
                      onUploaded={handleAssetUploaded}
                    />
                  </div>
                </div>

                <div className="grid gap-4">
                  {(activeCourse?.assets || []).length === 0 ? (
                    <AdminCard className="border-dashed p-6">
                      <p className="text-sm text-slate-400">No supplemental assets uploaded yet for this course.</p>
                    </AdminCard>
                  ) : (
                    activeCourse?.assets.map((asset) => {
                      const Icon = getAssetIcon(asset.type);
                      return (
                        <AdminCard key={asset.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-white">{asset.title}</p>
                                <StatusPill tone="info">{asset.type}</StatusPill>
                              </div>
                              <p className="mt-1 text-xs text-slate-400">{asset.fileName}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <AdminButton type="button" variant="secondary" onClick={() => window.open(asset.url, "_blank")}>
                              Open
                            </AdminButton>
                            <AdminButton type="button" variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDeleteAsset(asset.id)}>
                              Delete
                            </AdminButton>
                          </div>
                        </AdminCard>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </AdminModal>

      <CourseBulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        instructorOptions={instructorOptions}
      />
    </div>
  );
}
