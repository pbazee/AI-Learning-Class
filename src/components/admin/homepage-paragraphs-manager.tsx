"use client";

import { startTransition, useMemo, useState } from "react";
import { Edit3, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  deleteHomepageParagraphAction,
  saveHomepageParagraphAction,
} from "@/app/admin/actions";
import {
  AdminButton,
  AdminCard,
  AdminModal,
  AdminPageIntro,
  AdminStatCard,
  AdminStatGrid,
  AdminTextarea,
  FieldLabel,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";
import type { HomepageParagraphEntry } from "@/lib/homepage-paragraphs";

const updatedAtFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function HomepageParagraphsManager({
  paragraphs,
}: {
  paragraphs: HomepageParagraphEntry[];
}) {
  const [selected, setSelected] = useState<HomepageParagraphEntry | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [resettingKey, setResettingKey] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const stats = useMemo(
    () => ({
      total: paragraphs.length,
      customized: paragraphs.filter((paragraph) => !paragraph.isDefault).length,
      defaults: paragraphs.filter((paragraph) => paragraph.isDefault).length,
    }),
    [paragraphs]
  );

  function openEditor(paragraph: HomepageParagraphEntry) {
    setSelected(paragraph);
    setContent(paragraph.content);
  }

  function closeEditor() {
    setSelected(null);
    setContent("");
  }

  function handleSave() {
    if (!selected) {
      return;
    }

    setSaving(true);
    startTransition(async () => {
      try {
        const result = await saveHomepageParagraphAction({
          sectionKey: selected.sectionKey,
          content,
        });

        toast(result.message, result.success ? "success" : "error");

        if (result.success) {
          closeEditor();
          router.refresh();
        }
      } finally {
        setSaving(false);
      }
    });
  }

  function handleReset(paragraph: HomepageParagraphEntry) {
    if (paragraph.isDefault) {
      return;
    }

    const confirmed = window.confirm("Reset this section back to its default homepage copy?");
    if (!confirmed) {
      return;
    }

    setResettingKey(paragraph.sectionKey);
    startTransition(async () => {
      try {
        const result = await deleteHomepageParagraphAction({
          sectionKey: paragraph.sectionKey,
        });

        toast(result.message, result.success ? "success" : "error");

        if (result.success) {
          if (selected?.sectionKey === paragraph.sectionKey) {
            closeEditor();
          }
          router.refresh();
        }
      } finally {
        setResettingKey(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Homepage Paragraphs"
        description="Control the short supporting copy beneath key homepage sections without touching code. Saved changes are revalidated for the homepage immediately."
      />

      <AdminStatGrid>
        <AdminStatCard label="Tracked Sections" value={stats.total} />
        <AdminStatCard
          label="Custom Copy"
          value={stats.customized}
          detail="Sections currently overriding the built-in defaults"
          accent="from-cyan-500 to-blue-500"
        />
        <AdminStatCard
          label="Using Defaults"
          value={stats.defaults}
          detail="Sections still showing the original homepage copy"
          accent="from-slate-500 to-slate-300"
        />
      </AdminStatGrid>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Section
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Current Text
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Updated
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paragraphs.map((paragraph) => (
                <tr key={paragraph.sectionKey} className="hover:bg-muted/20">
                  <td className="px-4 py-4 align-top">
                    <div>
                      <p className="font-semibold text-foreground">{paragraph.sectionName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{paragraph.sectionKey}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="max-w-2xl text-sm leading-6 text-foreground/90">{paragraph.content}</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <StatusPill tone={paragraph.isDefault ? "neutral" : "info"}>
                      {paragraph.isDefault ? "Default" : "Customized"}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-muted-foreground">
                    {paragraph.updatedAt
                      ? updatedAtFormatter.format(new Date(paragraph.updatedAt))
                      : "Using default copy"}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex justify-end gap-2">
                      <AdminButton
                        type="button"
                        variant="ghost"
                        icon={<Edit3 className="h-4 w-4" />}
                        onClick={() => openEditor(paragraph)}
                      >
                        Edit
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="ghost"
                        icon={<RotateCcw className="h-4 w-4" />}
                        busy={resettingKey === paragraph.sectionKey}
                        disabled={paragraph.isDefault}
                        onClick={() => handleReset(paragraph)}
                      >
                        Reset
                      </AdminButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminModal
        open={Boolean(selected)}
        onClose={closeEditor}
        title={selected ? `Edit ${selected.sectionName}` : "Edit Paragraph"}
        description="Update the paragraph below and save. The homepage section will use this text instead of the built-in default."
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <AdminButton type="button" variant="secondary" onClick={closeEditor}>
              Cancel
            </AdminButton>
            <AdminButton type="button" busy={saving} onClick={handleSave}>
              Save Changes
            </AdminButton>
          </div>
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div>
              <FieldLabel>Paragraph text</FieldLabel>
              <AdminTextarea
                rows={7}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write a short section description..."
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Keep it concise so the homepage layout stays balanced.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Default Copy
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{selected.defaultContent}</p>
            </div>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
