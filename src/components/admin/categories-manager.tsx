"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCategoryAction, saveCategoryAction } from "@/app/admin/actions";
import { MediaUploader } from "@/components/admin/media-uploader";
import { SimpleCrudManager } from "@/components/admin/simple-crud-manager";
import { AdminCard, AdminInput, AdminSwitch, FieldLabel, StatusPill } from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  imagePath?: string | null;
  icon?: string | null;
  color?: string | null;
  isActive: boolean;
  parentId?: string | null;
  parentName?: string | null;
  courseCount: number;
};

export function CategoriesManager({
  categories,
  parentOptions,
}: {
  categories: CategoryRow[];
  parentOptions: Array<{ label: string; value: string }>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  function toggleCategory(category: CategoryRow) {
    setBusyId(category.id);
    startTransition(async () => {
      try {
        const result = await saveCategoryAction({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description || "",
          imageUrl: category.imageUrl || "",
          imagePath: category.imagePath || "",
          icon: category.icon || "",
          color: category.color || "#2563eb",
          parentId: category.parentId || null,
          isActive: !category.isActive,
        });
        toast(result.message, result.success ? "success" : "error");
        if (result.success) {
          router.refresh();
        }
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <SimpleCrudManager
      title="Categories"
      description="Create and organize the course and blog taxonomies that power the storefront and admin filters."
      stats={[
        { label: "Total Categories", value: categories.length },
        { label: "With Parent", value: categories.filter((category) => category.parentId).length },
        { label: "Active", value: categories.filter((category) => category.isActive).length },
        { label: "Courses Assigned", value: categories.reduce((sum, category) => sum + category.courseCount, 0), detail: "Across the taxonomy" },
        { label: "Top-Level", value: categories.filter((category) => !category.parentId).length },
      ]}
      items={categories}
      createLabel="New Category"
      dialogTitle="Category Editor"
      emptyTitle="No categories yet"
      emptyDescription="Create your first category to organize courses, blogs, and promotional content."
      getEmptyForm={() => ({
        id: "",
        name: "",
        slug: "",
        description: "",
        imageUrl: "",
        imagePath: "",
        icon: "",
        color: "#2563eb",
        isActive: true,
        parentId: "",
      })}
      mapItemToForm={(item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description || "",
        imageUrl: item.imageUrl || "",
        imagePath: item.imagePath || "",
        icon: item.icon || "",
        color: item.color || "#2563eb",
        isActive: item.isActive,
        parentId: item.parentId || "",
      })}
      buildPayload={(form) => ({
        id: form.id || undefined,
        name: form.name,
        slug: form.slug,
        description: form.description,
        imageUrl: form.imageUrl,
        imagePath: form.imagePath,
        icon: form.icon,
        color: form.color,
        isActive: Boolean(form.isActive),
        parentId: form.parentId || null,
      })}
      onSave={saveCategoryAction}
      onDelete={deleteCategoryAction}
      fields={[
        { name: "name", label: "Name", type: "text", placeholder: "Machine Learning" },
        { name: "slug", label: "Slug", type: "text", placeholder: "machine-learning", hint: "Leave blank to auto-generate." },
        {
          name: "imageUrl",
          label: "Category Image",
          type: "url",
          colSpan: 2,
          render: ({ form, updateForm }) => (
            <div className="space-y-4">
              <div>
                <FieldLabel>Category Image</FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Upload from device to the shared admin bucket or paste a direct image URL.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_40px_minmax(0,0.9fr)] lg:items-start">
                <MediaUploader
                  label="Upload from device"
                  hint="Recommended for managing category artwork in Supabase Storage."
                  folder="categories"
                  accept="image/*"
                  value={{
                    url: form.imageUrl,
                    path: form.imagePath,
                    fileName: form.name || "Category image",
                    mimeType: "image/*",
                  }}
                  onUploaded={(file) =>
                    updateForm({
                      imageUrl: file.url,
                      imagePath: file.path,
                    })
                  }
                  onRemoved={() =>
                    updateForm({
                      imageUrl: "",
                      imagePath: "",
                    })
                  }
                />

                <div className="hidden h-full items-center justify-center lg:flex">
                  <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Or
                  </span>
                </div>

                <AdminCard className="p-5">
                  <FieldLabel>Use image URL</FieldLabel>
                  <AdminInput
                    type="url"
                    placeholder="https://example.com/category-cover.jpg"
                    value={form.imageUrl}
                    onChange={(event) =>
                      updateForm({
                        imageUrl: event.target.value,
                      })
                    }
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Direct URLs are saved as the display image. Uploaded assets also keep their storage path.
                  </p>

                  {form.imageUrl ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                      <div className="border-b border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Preview
                      </div>
                      <div className="p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.imageUrl}
                          alt={form.name || "Category preview"}
                          className="h-36 w-full rounded-2xl object-cover"
                        />
                      </div>
                    </div>
                  ) : null}
                </AdminCard>
              </div>
            </div>
          ),
        },
        { name: "icon", label: "Lucide Icon", type: "text", placeholder: "Brain" },
        { name: "color", label: "Accent Color", type: "color" },
        { name: "isActive", label: "Active Category", type: "switch", hint: "Inactive categories stay hidden on the frontend." },
        { name: "parentId", label: "Parent Category", type: "select", options: parentOptions, emptyLabel: "Top-level (no parent)", hint: "Leave empty to create a top-level category." },
        { name: "description", label: "Description", type: "textarea", rows: 4, colSpan: 2, placeholder: "Describe what this category covers." },
      ]}
      columns={[
        {
          header: "Category",
          cell: (item) => (
            <div>
              <p className="font-semibold text-foreground">{item.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.description || "No description yet."}</p>
            </div>
          ),
        },
        {
          header: "Slug",
          cell: (item) => <code className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">{item.slug}</code>,
        },
        {
          header: "Parent",
          cell: (item) => <span className="text-sm text-muted-foreground">{item.parentName || "Root"}</span>,
        },
        {
          header: "Visibility",
          cell: (item) => (
            <div className="min-w-[180px]">
              <AdminSwitch
                checked={item.isActive}
                onChange={() => toggleCategory(item)}
                label={busyId === item.id ? "Updating..." : item.isActive ? "Active" : "Inactive"}
                hint="Visible on the storefront"
              />
            </div>
          ),
        },
        {
          header: "Courses",
          cell: (item) => <span className="text-sm font-semibold text-foreground">{item.courseCount}</span>,
        },
        {
          header: "Theme",
          cell: (item) => (
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: item.color || "#2563eb" }} />
              <span className="text-xs text-muted-foreground">{item.color || "#2563eb"}</span>
            </div>
          ),
        },
        {
          header: "Status",
          cell: (item) => (
            <StatusPill tone={item.isActive ? "success" : "neutral"}>
              {item.isActive ? "Active" : "Inactive"}
            </StatusPill>
          ),
        },
      ]}
    />
  );
}
