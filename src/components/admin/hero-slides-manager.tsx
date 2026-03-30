"use client";

import { deleteHeroSlideAction, saveHeroSlideAction } from "@/app/admin/actions";
import { MediaUploader } from "@/components/admin/media-uploader";
import { SimpleCrudManager } from "@/components/admin/simple-crud-manager";
import { AdminInput, FieldLabel, StatusPill } from "@/components/admin/ui";

type HeroRow = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl: string;
  imagePath?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  order: number;
  isActive: boolean;
  autoSlideInterval?: number | null;
};

export function HeroSlidesManager({ slides }: { slides: HeroRow[] }) {
  return (
    <SimpleCrudManager
      title="Hero Slides"
      description="Shape the homepage narrative with carousel slides, CTA buttons, and campaign sequencing."
      stats={[
        { label: "Total Slides", value: slides.length },
        { label: "Active", value: slides.filter((slide) => slide.isActive).length },
        { label: "With CTA", value: slides.filter((slide) => slide.ctaText).length },
        { label: "Top Priority", value: slides.length ? Math.min(...slides.map((slide) => slide.order)) : 0, detail: "Lowest order wins" },
      ]}
      items={slides}
      createLabel="New Slide"
      dialogTitle="Hero Slide"
      emptyTitle="No hero slides yet"
      emptyDescription="Add slides to power the animated homepage hero carousel."
      getEmptyForm={() => ({
        id: "",
        title: "",
        subtitle: "",
        description: "",
        imageUrl: "",
        imagePath: "",
        ctaText: "",
        ctaLink: "",
        order: 0,
        isActive: true,
        autoSlideInterval: "" as unknown as number,
      })}
      mapItemToForm={(item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle || "",
        description: item.description || "",
        imageUrl: item.imageUrl,
        imagePath: item.imagePath || "",
        ctaText: item.ctaText || "",
        ctaLink: item.ctaLink || "",
        order: item.order,
        isActive: item.isActive,
        autoSlideInterval: item.autoSlideInterval ?? ("" as unknown as number),
      })}
      buildPayload={(form) => ({
        id: form.id || undefined,
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        imageUrl: form.imageUrl,
        imagePath: form.imagePath,
        ctaText: form.ctaText,
        ctaLink: form.ctaLink,
        order: Number(form.order) || 0,
        isActive: Boolean(form.isActive),
        autoSlideInterval: form.autoSlideInterval != null && String(form.autoSlideInterval) !== ""
          ? Number(form.autoSlideInterval)
          : null,
      })}
      onSave={saveHeroSlideAction}
      onDelete={deleteHeroSlideAction}
      fields={[
        { name: "title", label: "Headline", type: "text", placeholder: "Learn AI. Build the Future." },
        { name: "subtitle", label: "Eyebrow", type: "text", placeholder: "Master LLM Engineering" },
        {
          name: "imageUrl",
          label: "Hero Image",
          type: "url",
          colSpan: 2,
          render: ({ form, updateForm, setFieldValue }) => (
            <div className="space-y-4">
              <MediaUploader
                label="Hero Image"
                hint="Upload hero artwork from your device or keep using a public image URL."
                folder="hero-slides"
                accept="image/*"
                value={{
                  url: form.imageUrl,
                  path: form.imagePath,
                  fileName: form.title || "Hero slide image",
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
              <div>
                <FieldLabel>Image URL</FieldLabel>
                <AdminInput
                  type="url"
                  placeholder="https://..."
                  value={form.imageUrl}
                  onChange={(event) => {
                    setFieldValue(event.target.value);
                    if (form.imagePath) {
                      updateForm({ imagePath: "" });
                    }
                  }}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Uploaded images fill this automatically, but you can still paste a public URL when needed.
                </p>
              </div>
            </div>
          ),
        },
        { name: "order", label: "Display Order", type: "number" },
        { name: "autoSlideInterval", label: "Auto-slide Interval (seconds)", type: "number", placeholder: "6", hint: "Leave blank to use the global default (6s). Set per-slide to override." },
        { name: "ctaText", label: "CTA Label", type: "text", placeholder: "Explore Courses" },
        { name: "ctaLink", label: "CTA Link", type: "url", placeholder: "/courses" },
        { name: "isActive", label: "Visible Slide", type: "switch", hint: "Hidden slides stay saved but won’t render on the homepage." },
        { name: "description", label: "Description", type: "textarea", rows: 4, colSpan: 2 },
      ]}
      columns={[
        {
          header: "Slide",
          cell: (item) => (
            <div>
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.subtitle || item.description || "No supporting copy yet."}</p>
            </div>
          ),
        },
        {
          header: "CTA",
          cell: (item) => <span className="text-sm text-muted-foreground">{item.ctaText ? `${item.ctaText} -> ${item.ctaLink}` : "No CTA"}</span>,
        },
        {
          header: "Order",
          cell: (item) => <span className="text-sm font-semibold text-foreground">{item.order}</span>,
        },
        {
          header: "Status",
          cell: (item) => <StatusPill tone={item.isActive ? "success" : "neutral"}>{item.isActive ? "Active" : "Hidden"}</StatusPill>,
        },
      ]}
    />
  );
}
