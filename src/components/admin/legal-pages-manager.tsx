"use client";

import { startTransition, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveLegalDocumentAction } from "@/app/admin/actions";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  AdminButton,
  AdminCard,
  AdminPageIntro,
  AdminStatCard,
  AdminStatGrid,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";

type LegalPageRow = {
  slug: "privacy-policy" | "terms-of-service" | "refund-policy";
  title: string;
  route: "/privacy" | "/terms" | "/refund";
  content: string;
  updatedAtLabel: string;
};

const labels: Record<LegalPageRow["slug"], string> = {
  "privacy-policy": "Privacy Policy",
  "terms-of-service": "Terms of Service",
  "refund-policy": "Refund Policy",
};

export function LegalPagesManager({ documents }: { documents: LegalPageRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeSlug, setActiveSlug] = useState<LegalPageRow["slug"]>(documents[0]?.slug ?? "privacy-policy");
  const [drafts, setDrafts] = useState<Record<string, { title: string; content: string }>>(
    Object.fromEntries(documents.map((document) => [document.slug, { title: document.title, content: document.content }]))
  );
  const [savingSlug, setSavingSlug] = useState<LegalPageRow["slug"] | null>(null);

  const activeDocument = useMemo(
    () => documents.find((document) => document.slug === activeSlug) ?? documents[0],
    [activeSlug, documents]
  );

  if (!activeDocument) {
    return null;
  }

  const currentDraft = drafts[activeDocument.slug] ?? {
    title: activeDocument.title,
    content: activeDocument.content,
  };

  function updateDraft(patch: Partial<{ title: string; content: string }>) {
    setDrafts((current) => ({
      ...current,
      [activeDocument.slug]: {
        title: patch.title ?? currentDraft.title,
        content: patch.content ?? currentDraft.content,
      },
    }));
  }

  function saveActiveDocument() {
    setSavingSlug(activeDocument.slug);
    startTransition(async () => {
      try {
        const result = await saveLegalDocumentAction({
          slug: activeDocument.slug,
          title: currentDraft.title,
          content: currentDraft.content,
        });

        toast(result.message, result.success ? "success" : "error");

        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Unable to save the legal page right now.", "error");
      } finally {
        setSavingSlug(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Legal Pages"
        description="Edit the customer-facing privacy, terms, and refund pages without touching code. Changes publish to the live public pages and checkout notices after save."
        actions={
          <AdminButton type="button" busy={savingSlug === activeDocument.slug} icon={<Save className="h-4 w-4" />} onClick={saveActiveDocument}>
            Save {labels[activeDocument.slug]}
          </AdminButton>
        }
      />

      <AdminStatGrid>
        {documents.map((document) => (
          <AdminStatCard
            key={document.slug}
            label={labels[document.slug]}
            value={document.updatedAtLabel}
            detail={document.route}
            accent={document.slug === activeSlug ? "from-blue-500 to-cyan-400" : undefined}
          />
        ))}
      </AdminStatGrid>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <AdminCard className="space-y-3 p-4">
          {documents.map((document) => (
            <button
              key={document.slug}
              type="button"
              onClick={() => setActiveSlug(document.slug)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                document.slug === activeSlug
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-border bg-background hover:border-blue-300/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-foreground">{labels[document.slug]}</p>
                <StatusPill tone={document.slug === activeSlug ? "info" : "neutral"}>
                  {document.route}
                </StatusPill>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Last updated {document.updatedAtLabel}
              </p>
            </button>
          ))}
        </AdminCard>

        <AdminCard className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Page title
            </label>
            <input
              type="text"
              value={currentDraft.title}
              onChange={(event) => updateDraft({ title: event.target.value })}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Rich content
            </p>
            <RichTextEditor
              value={currentDraft.content}
              onChange={(value) => updateDraft({ content: value })}
              className="min-h-[520px]"
            />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
