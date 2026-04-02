"use client";

import { deleteTrustedLogoAction, saveTrustedLogoAction } from "@/app/admin/actions";
import { MediaUploader } from "@/components/admin/media-uploader";
import { SimpleCrudManager } from "@/components/admin/simple-crud-manager";
import { AdminInput, FieldLabel, StatusPill } from "@/components/admin/ui";

type TrustedLogoRow = {
  id: string;
  name: string;
  imageUrl: string;
  imagePath?: string | null;
  websiteUrl?: string | null;
  order: number;
  isActive: boolean;
};

export function TrustedLogosManager({ logos }: { logos: TrustedLogoRow[] }) {
  return (
    <SimpleCrudManager
      title="Trusted Logos"
      description="Manage the partner and ecosystem logos that scroll beneath the homepage hero."
      stats={[
        { label: "Total Logos", value: logos.length },
        { label: "Active", value: logos.filter((logo) => logo.isActive).length },
        { label: "Clickable", value: logos.filter((logo) => logo.websiteUrl).length },
        { label: "First Position", value: logos.length ? Math.min(...logos.map((logo) => logo.order)) : 0, detail: "Lower order appears first" },
      ]}
      items={logos}
      createLabel="Add Logo"
      dialogTitle="Trusted Logo"
      emptyTitle="No trusted logos yet"
      emptyDescription="Add logo artwork to power the homepage marquee."
      getEmptyForm={() => ({
        id: "",
        name: "",
        imageUrl: "",
        imagePath: "",
        websiteUrl: "",
        order: 0,
        isActive: true,
      })}
      mapItemToForm={(item) => ({
        id: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        imagePath: item.imagePath || "",
        websiteUrl: item.websiteUrl || "",
        order: item.order,
        isActive: item.isActive,
      })}
      buildPayload={(form) => ({
        id: form.id || undefined,
        name: form.name,
        imageUrl: form.imageUrl,
        imagePath: form.imagePath,
        websiteUrl: form.websiteUrl,
        order: Number(form.order) || 0,
        isActive: Boolean(form.isActive),
      })}
      onSave={saveTrustedLogoAction}
      onDelete={deleteTrustedLogoAction}
      fields={[
        { name: "name", label: "Logo Name", type: "text", placeholder: "OpenAI" },
        {
          name: "imageUrl",
          label: "Logo Asset",
          type: "url",
          colSpan: 2,
          render: ({ form, updateForm, setFieldValue }) => (
            <div className="space-y-4">
              <MediaUploader
                label="Logo Asset"
                hint="Upload a logo with transparent background or paste a public image URL."
                folder="trusted-logos"
                accept="image/*"
                value={{
                  url: form.imageUrl,
                  path: form.imagePath,
                  fileName: form.name || "Trusted logo",
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
              </div>
            </div>
          ),
        },
        { name: "websiteUrl", label: "Website URL", type: "url", placeholder: "https://openai.com" },
        { name: "order", label: "Display Order", type: "number" },
        { name: "isActive", label: "Show In Marquee", type: "switch", hint: "Inactive logos stay saved but disappear from the homepage." },
      ]}
      columns={[
        {
          header: "Logo",
          cell: (item) => (
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/90 p-3">
                <img src={item.imageUrl} alt={item.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.websiteUrl || "No website linked"}</p>
              </div>
            </div>
          ),
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
