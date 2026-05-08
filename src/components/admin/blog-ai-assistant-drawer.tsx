"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { AdminButton, AdminCard, AdminDrawer } from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";

type BlogAiAction =
  | "titleIdeas"
  | "metaDescription"
  | "expandSection"
  | "improveReadability"
  | "suggestTags";

type BlogAiResult =
  | { action: "titleIdeas"; suggestions: string[] }
  | { action: "metaDescription"; text: string }
  | { action: "expandSection"; text: string }
  | { action: "improveReadability"; text: string }
  | { action: "suggestTags"; tags: string[] };

const actionLabels: Record<BlogAiAction, string> = {
  titleIdeas: "Generate Title Ideas",
  metaDescription: "Write Meta Description",
  expandSection: "Expand Section",
  improveReadability: "Improve Readability",
  suggestTags: "Suggest Tags",
};

export function BlogAiAssistantDrawer({
  open,
  onClose,
  title,
  excerpt,
  content,
  focusKeyword,
  metaTitle,
  metaDescription,
  selectedText,
  onApplyTitle,
  onApplyMetaTitle,
  onApplyMetaDescription,
  onApplyTags,
  onReplaceSelection,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  excerpt: string;
  content: string;
  focusKeyword: string;
  metaTitle: string;
  metaDescription: string;
  selectedText: string;
  onApplyTitle: (value: string) => void;
  onApplyMetaTitle: (value: string) => void;
  onApplyMetaDescription: (value: string) => void;
  onApplyTags: (values: string[]) => void;
  onReplaceSelection: (value: string) => void;
}) {
  const { toast } = useToast();
  const [loadingAction, setLoadingAction] = useState<BlogAiAction | null>(null);
  const [result, setResult] = useState<BlogAiResult | null>(null);

  const contextSummary = useMemo(
    () => title.trim() || excerpt.trim() || focusKeyword.trim() || "Untitled draft",
    [excerpt, focusKeyword, title]
  );

  async function runAction(action: BlogAiAction) {
    if ((action === "expandSection" || action === "improveReadability") && !selectedText.trim()) {
      toast("Highlight some blog text first, then run that AI action.", "error");
      return;
    }

    setLoadingAction(action);
    setResult(null);

    try {
      const response = await fetch("/api/admin/blog-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          title,
          excerpt,
          content,
          focusKeyword,
          metaTitle,
          metaDescription,
          selection: selectedText,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            result?: BlogAiResult;
          }
        | null;

      if (!response.ok || !payload?.result) {
        throw new Error(payload?.error || "The AI assistant could not complete that request.");
      }

      setResult(payload.result);
    } catch (error) {
      toast(error instanceof Error ? error.message : "The AI assistant is unavailable right now.", "error");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title="Ask AI"
      description="Generate SEO-ready ideas, rewrite selected copy, and apply the output only when you like it."
      size="lg"
      footer={
        <div className="flex justify-end">
          <AdminButton type="button" variant="secondary" onClick={onClose}>
            Close
          </AdminButton>
        </div>
      }
    >
      <div className="space-y-5">
        <AdminCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
            Working context
          </p>
          <p className="mt-2 text-sm font-semibold text-white">{contextSummary}</p>
          {selectedText.trim() ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Selected text
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{selectedText}</p>
            </div>
          ) : null}
        </AdminCard>

        <div className="grid gap-3">
          {(Object.keys(actionLabels) as BlogAiAction[]).map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => void runAction(action)}
              disabled={Boolean(loadingAction)}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-left transition-all hover:border-primary-blue/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="text-sm font-semibold text-white">{actionLabels[action]}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {action === "titleIdeas"
                    ? "Create five SEO-friendly title options."
                    : action === "metaDescription"
                      ? "Generate a concise search snippet."
                      : action === "suggestTags"
                        ? "Extract five relevant tags from the draft."
                        : "Use the selected paragraph from the editor."}
                </p>
              </div>
              {loadingAction === action ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary-blue" />
              ) : (
                <Wand2 className="h-4 w-4 text-primary-blue" />
              )}
            </button>
          ))}
        </div>

        {result ? (
          <AdminCard className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI suggestion ready</p>
                <p className="text-xs text-slate-400">
                  Review it, then accept or dismiss it.
                </p>
              </div>
            </div>

            {result.action === "titleIdeas" ? (
              <div className="space-y-3">
                {result.suggestions.map((suggestion) => (
                  <div key={suggestion} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-semibold text-white">{suggestion}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AdminButton type="button" onClick={() => onApplyTitle(suggestion)}>
                        Use as post title
                      </AdminButton>
                      <AdminButton type="button" variant="secondary" onClick={() => onApplyMetaTitle(suggestion)}>
                        Use as meta title
                      </AdminButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {result.action === "metaDescription" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
                  {result.text}
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminButton type="button" onClick={() => onApplyMetaDescription(result.text)}>
                    Apply description
                  </AdminButton>
                  <AdminButton type="button" variant="secondary" onClick={() => setResult(null)}>
                    Reject
                  </AdminButton>
                </div>
              </div>
            ) : null}

            {result.action === "suggestTags" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-primary-blue/30 bg-primary-blue/10 px-3 py-1 text-xs font-semibold text-primary-blue"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminButton type="button" onClick={() => onApplyTags(result.tags)}>
                    Apply all tags
                  </AdminButton>
                  <AdminButton type="button" variant="secondary" onClick={() => setResult(null)}>
                    Reject
                  </AdminButton>
                </div>
              </div>
            ) : null}

            {result.action === "expandSection" || result.action === "improveReadability" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
                  {result.text}
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminButton type="button" onClick={() => onReplaceSelection(result.text)}>
                    Replace selected text
                  </AdminButton>
                  <AdminButton type="button" variant="secondary" onClick={() => setResult(null)}>
                    Reject
                  </AdminButton>
                </div>
              </div>
            ) : null}
          </AdminCard>
        ) : null}
      </div>
    </AdminDrawer>
  );
}
