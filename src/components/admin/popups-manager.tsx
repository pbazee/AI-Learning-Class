"use client";

import { startTransition, useState } from "react";
import { Layers3, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deletePopupAction, savePopupAction } from "@/app/admin/actions";
import { MediaUploader } from "@/components/admin/media-uploader";
import {
  AdminButton,
  AdminCard,
  AdminCheckbox,
  AdminInput,
  AdminModal,
  AdminPageIntro,
  AdminSelect,
  AdminStatCard,
  AdminStatGrid,
  AdminTextarea,
  CreateButton,
  EmptyState,
  FieldLabel,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/toaster";

type PopupRow = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  imagePath?: string | null;
  buttonText?: string | null;
  link?: string | null;
  showOn: "HOMEPAGE_ONLY" | "COURSE_PAGES" | "BLOG_PAGES" | "ALL_PAGES";
  delaySeconds: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
};

const showOnOptions = [
  { label: "Homepage only", value: "HOMEPAGE_ONLY" },
  { label: "Course pages", value: "COURSE_PAGES" },
  { label: "Blog pages", value: "BLOG_PAGES" },
  { label: "Site wide", value: "ALL_PAGES" },
];

function getClientErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function PopupsManager({ popups }: { popups: PopupRow[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    id: "",
    title: "",
    content: "",
    imageUrl: "",
    imagePath: "",
    buttonText: "Shop now",
    link: "/products",
    showOn: "HOMEPAGE_ONLY" as PopupRow["showOn"],
    delaySeconds: 4,
    startsAt: "",
    endsAt: "",
    isActive: true,
  });
  const router = useRouter();
  const { toast } = useToast();

  function openCreate() {
    setForm({
      id: "",
      title: "",
      content: "",
      imageUrl: "",
      imagePath: "",
      buttonText: "Shop now",
      link: "/products",
      showOn: "HOMEPAGE_ONLY",
      delaySeconds: 4,
      startsAt: "",
      endsAt: "",
      isActive: true,
    });
    setOpen(true);
  }

  function openEdit(popup: PopupRow) {
    setForm({
      id: popup.id,
      title: popup.title,
      content: popup.content,
      imageUrl: popup.imageUrl || "",
      imagePath: popup.imagePath || "",
      buttonText: popup.buttonText || "Shop now",
      link: popup.link || "/products",
      showOn: popup.showOn,
      delaySeconds: popup.delaySeconds,
      startsAt: popup.startsAt || "",
      endsAt: popup.endsAt || "",
      isActive: popup.isActive,
    });
    setOpen(true);
  }

  function handleSave() {
    setBusy(true);
    startTransition(async () => {
      try {
        const result = await savePopupAction({
          id: form.id || undefined,
          title: form.title,
          content: form.content,
          imageUrl: form.imageUrl,
          imagePath: form.imagePath,
          buttonText: form.buttonText,
          link: form.link,
          showOn: form.showOn,
          delaySeconds: form.delaySeconds,
          startsAt: form.startsAt,
          endsAt: form.endsAt,
          isActive: form.isActive,
        });

        toast(result.message, result.success ? "success" : "error");
        if (result.success) {
          setOpen(false);
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
    const confirmed = window.confirm("Delete this popup campaign?");
    if (!confirmed) {
      return;
    }

    setBusy(true);
    startTransition(async () => {
      try {
        const result = await deletePopupAction(id);
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

  const selectedShowOn = showOnOptions.find((option) => option.value === form.showOn)?.label || "Homepage only";

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Campaigns"
        title="Popups"
        description="Create polished promotional popups with precise placement, timing, and a live preview."
        actions={<CreateButton onClick={openCreate}>Create Popup</CreateButton>}
      />

      <AdminStatGrid>
        <AdminStatCard label="Total Popups" value={popups.length} />
        <AdminStatCard label="Active" value={popups.filter((popup) => popup.isActive).length} accent="from-emerald-500 to-teal-400" />
        <AdminStatCard label="Scheduled" value={popups.filter((popup) => popup.endsAt).length} accent="from-amber-500 to-orange-400" />
        <AdminStatCard label="With Image" value={popups.filter((popup) => popup.imageUrl).length} accent="from-violet-500 to-fuchsia-400" />
      </AdminStatGrid>

      {popups.length === 0 ? (
        <EmptyState
          title="No popup campaigns yet"
          description="Create your first popup to promote offers, launches, or announcements."
          action={<CreateButton onClick={openCreate}>Create Popup</CreateButton>}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {popups.map((popup) => (
            <AdminCard key={popup.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{popup.title}</p>
                  <p className="mt-2 text-sm text-slate-400">{popup.content}</p>
                </div>
                <StatusPill tone={popup.isActive ? "success" : "neutral"}>
                  {popup.isActive ? "Active" : "Inactive"}
                </StatusPill>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone="info">{showOnOptions.find((option) => option.value === popup.showOn)?.label}</StatusPill>
                <StatusPill tone="warning">Delay {popup.delaySeconds}s</StatusPill>
                {popup.buttonText ? <StatusPill tone="neutral">{popup.buttonText}</StatusPill> : null}
              </div>
              <div className="mt-5 flex gap-2">
                <AdminButton type="button" variant="secondary" onClick={() => openEdit(popup)}>
                  Edit
                </AdminButton>
                <AdminButton type="button" variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(popup.id)}>
                  Delete
                </AdminButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title="Create popup"
        description="Publish promotional popups with a controlled delay and CTA."
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <AdminButton type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton type="button" busy={busy} onClick={handleSave}>
              {form.id ? "Save popup" : "Create popup"}
            </AdminButton>
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div>
              <FieldLabel>Title</FieldLabel>
              <AdminInput value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Message</FieldLabel>
              <AdminTextarea rows={5} value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>CTA text</FieldLabel>
                <AdminInput value={form.buttonText} onChange={(event) => setForm((current) => ({ ...current, buttonText: event.target.value }))} />
              </div>
              <div>
                <FieldLabel>CTA Link</FieldLabel>
                <AdminInput value={form.link} onChange={(event) => setForm((current) => ({ ...current, link: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>Show on</FieldLabel>
                <AdminSelect value={form.showOn} onChange={(event) => setForm((current) => ({ ...current, showOn: event.target.value as PopupRow["showOn"] }))}>
                  {showOnOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <div>
                <FieldLabel>Delay (seconds)</FieldLabel>
                <AdminInput type="number" min="0" value={String(form.delaySeconds)} onChange={(event) => setForm((current) => ({ ...current, delaySeconds: Number(event.target.value) }))} />
              </div>
            </div>
            <div>
              <FieldLabel>Expires at (optional)</FieldLabel>
              <AdminInput type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} />
            </div>
            <MediaUploader
              label="Popup Image (optional)"
              hint="Upload a supporting image directly from your device."
              folder="popups"
              accept="image/*"
              value={{
                url: form.imageUrl,
                path: form.imagePath,
                fileName: form.title || "Popup image",
                mimeType: "image/*",
              }}
              onUploaded={(file) => setForm((current) => ({ ...current, imageUrl: file.url, imagePath: file.path }))}
              onRemoved={() => setForm((current) => ({ ...current, imageUrl: "", imagePath: "" }))}
            />
            <AdminCheckbox
              checked={form.isActive}
              onChange={(value) => setForm((current) => ({ ...current, isActive: value }))}
              label="Popup is active"
              hint="Only active popup campaigns are eligible to render."
            />
          </div>

          <AdminCard className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Layers3 className="h-4 w-4 text-orange-300" />
              Preview
            </div>
            <div className="mt-5 rounded-[28px] border border-white/10 bg-[#070b12] p-6">
              {form.imageUrl ? (
                <div className="mb-5 overflow-hidden rounded-2xl border border-white/10">
                  <img src={form.imageUrl} alt={form.title || "Popup preview"} className="h-40 w-full object-cover" />
                </div>
              ) : null}
              <p className="text-2xl font-black text-white">{form.title || "Popup title"}</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {form.content || "Popup message preview"}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
                  {form.buttonText || "Shop now"}
                </button>
                <StatusPill tone="info">{selectedShowOn}</StatusPill>
                <StatusPill tone="warning">{form.delaySeconds}s delay</StatusPill>
              </div>
            </div>
          </AdminCard>
        </div>
      </AdminModal>
    </div>
  );
}
