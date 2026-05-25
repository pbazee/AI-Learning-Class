"use client";

import { startTransition, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Edit3, ImageIcon, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteBlogAction, saveBlogAction } from "@/app/admin/actions";
import { BlogAiAssistantDrawer } from "@/components/admin/blog-ai-assistant-drawer";
import { MediaUploader } from "@/components/admin/media-uploader";
import { RichTextEditor, type RichTextEditorHandle } from "@/components/admin/rich-text-editor";
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
import { useToast } from "@/components/ui/ToastProvider";
import { estimateReadingTimeMinutes } from "@/lib/reading-time";

type BlogRow = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverImage?: string | null;
  coverImagePath?: string | null;
  authorAvatarUrl?: string | null;
  authorAvatarPath?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  ogImagePath?: string | null;
  canonicalUrl?: string | null;
  noIndex: boolean;
  authorId: string;
  authorName: string;
  categoryId?: string | null;
  categoryName?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  tags: string[];
  publishedAt?: string | null;
};

type BlogFormState = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverImagePath: string;
  authorAvatarUrl: string;
  authorAvatarPath: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  ogImagePath: string;
  canonicalUrl: string;
  noIndex: boolean;
  authorId: string;
  categoryId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  tagsText: string;
};

function toLines(values: string[]) {
  return values.join("\n");
}

function fromLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildEmptyForm(authorId: string): BlogFormState {
  return {
    id: "",
    title: "",
    slug: "",
    excerpt: "",
    content: "<p></p>",
    coverImage: "",
    coverImagePath: "",
    authorAvatarUrl: "",
    authorAvatarPath: "",
    metaTitle: "",
    metaDescription: "",
    focusKeyword: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: "",
    ogImagePath: "",
    canonicalUrl: "",
    noIndex: false,
    authorId,
    categoryId: "",
    status: "DRAFT",
    tagsText: "",
  };
}

function mapPostToForm(post: BlogRow): BlogFormState {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || "",
    content: post.content,
    coverImage: post.coverImage || "",
    coverImagePath: post.coverImagePath || "",
    authorAvatarUrl: post.authorAvatarUrl || "",
    authorAvatarPath: post.authorAvatarPath || "",
    metaTitle: post.metaTitle || "",
    metaDescription: post.metaDescription || "",
    focusKeyword: post.focusKeyword || "",
    ogTitle: post.ogTitle || "",
    ogDescription: post.ogDescription || "",
    ogImageUrl: post.ogImageUrl || "",
    ogImagePath: post.ogImagePath || "",
    canonicalUrl: post.canonicalUrl || "",
    noIndex: post.noIndex,
    authorId: post.authorId,
    categoryId: post.categoryId || "",
    status: post.status,
    tagsText: toLines(post.tags),
  };
}

function CharacterCounter({
  current,
  limit,
}: {
  current: number;
  limit: number;
}) {
  return (
    <span className={current > limit ? "text-rose-400" : "text-slate-500"}>
      {current}/{limit}
    </span>
  );
}

export function BlogsManager({
  posts,
  categoryOptions,
  authorOptions,
}: {
  posts: BlogRow[];
  categoryOptions: Array<{ label: string; value: string }>;
  authorOptions: Array<{ label: string; value: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seoOpen, setSeoOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [selectedTextSnapshot, setSelectedTextSnapshot] = useState("");
  const [ogTitleDirty, setOgTitleDirty] = useState(false);
  const [ogDescriptionDirty, setOgDescriptionDirty] = useState(false);
  const [form, setForm] = useState<BlogFormState>(() => buildEmptyForm(authorOptions[0]?.value || ""));
  const editorRef = useRef<RichTextEditorHandle | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const readingTimeMinutes = useMemo(() => estimateReadingTimeMinutes(form.content), [form.content]);

  function openCreate() {
    setForm(buildEmptyForm(authorOptions[0]?.value || ""));
    setSeoOpen(true);
    setOgTitleDirty(false);
    setOgDescriptionDirty(false);
    setAiOpen(false);
    setOpen(true);
  }

  function openEdit(post: BlogRow) {
    setForm(mapPostToForm(post));
    setSeoOpen(true);
    setOgTitleDirty(Boolean(post.ogTitle && post.ogTitle !== (post.metaTitle || "")));
    setOgDescriptionDirty(Boolean(post.ogDescription && post.ogDescription !== (post.metaDescription || "")));
    setAiOpen(false);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setAiOpen(false);
  }

  function handleMetaTitleChange(nextValue: string) {
    setForm((current) => ({
      ...current,
      metaTitle: nextValue,
      ogTitle:
        !ogTitleDirty || !current.ogTitle || current.ogTitle === current.metaTitle
          ? nextValue
          : current.ogTitle,
    }));
  }

  function handleMetaDescriptionChange(nextValue: string) {
    setForm((current) => ({
      ...current,
      metaDescription: nextValue,
      ogDescription:
        !ogDescriptionDirty || !current.ogDescription || current.ogDescription === current.metaDescription
          ? nextValue
          : current.ogDescription,
    }));
  }

  function handleSave() {
    setBusy(true);
    startTransition(async () => {
      const result = await saveBlogAction({
        id: form.id || undefined,
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        content: form.content,
        coverImage: form.coverImage,
        coverImagePath: form.coverImagePath,
        authorAvatarUrl: form.authorAvatarUrl,
        authorAvatarPath: form.authorAvatarPath,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        focusKeyword: form.focusKeyword,
        ogTitle: form.ogTitle,
        ogDescription: form.ogDescription,
        ogImageUrl: form.ogImageUrl,
        ogImagePath: form.ogImagePath,
        canonicalUrl: form.canonicalUrl,
        noIndex: form.noIndex,
        authorId: form.authorId,
        categoryId: form.categoryId || null,
        status: form.status,
        tags: fromLines(form.tagsText),
      });
      setBusy(false);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        closeModal();
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this blog post?");
    if (!confirmed) return;

    setBusy(true);
    startTransition(async () => {
      const result = await deleteBlogAction(id);
      setBusy(false);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        router.refresh();
      }
    });
  }

  function openAiDrawer() {
    const selectedText = editorRef.current?.getSelectedText() || "";
    setSelectedTextSnapshot(selectedText);
    setAiOpen(true);
  }

  function applyMetaDescription(value: string) {
    handleMetaDescriptionChange(value.slice(0, 160));
    toast("Meta description updated.", "success");
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Blogs"
        description="Publish research breakdowns, career articles, and launch content with rich text, structured SEO metadata, and AI-assisted editorial workflows."
        actions={<CreateButton onClick={openCreate}>New Blog Post</CreateButton>}
      />

      <AdminStatGrid>
        <AdminStatCard label="Total Posts" value={posts.length} />
        <AdminStatCard label="Published" value={posts.filter((post) => post.status === "PUBLISHED").length} />
        <AdminStatCard label="Drafts" value={posts.filter((post) => post.status === "DRAFT").length} />
        <AdminStatCard label="Categories" value={new Set(posts.map((post) => post.categoryName).filter(Boolean)).size} />
      </AdminStatGrid>

      {posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Write your first article to populate the storefront blog and homepage journal section."
          action={<CreateButton onClick={openCreate}>Create Blog Post</CreateButton>}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Post", "Author", "Category", "Status", "Published", "Actions"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-muted/20">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-foreground">{post.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{post.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{post.authorName}</td>
                    <td className="px-4 py-4 text-muted-foreground">{post.categoryName || "Uncategorized"}</td>
                    <td className="px-4 py-4">
                      <StatusPill tone={post.status === "PUBLISHED" ? "success" : post.status === "ARCHIVED" ? "neutral" : "warning"}>
                        {post.status}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{post.publishedAt || "Not published"}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <AdminButton type="button" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(post)}>
                          Edit
                        </AdminButton>
                        <AdminButton type="button" variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(post.id)}>
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
        open={open}
        onClose={closeModal}
        title={form.id ? "Edit Blog Post" : "Create Blog Post"}
        description="Draft rich content, add metadata for search and social sharing, then publish when the post is ready."
        size="2xl"
        scrollBody
        stickyFooter
        footer={
          <div className="flex justify-end gap-3">
            <AdminButton type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </AdminButton>
            <AdminButton type="button" busy={busy} onClick={handleSave}>
              Save Post
            </AdminButton>
          </div>
        }
      >
        <div className="grid gap-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel>Title</FieldLabel>
              <AdminInput value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Slug</FieldLabel>
              <AdminInput value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="leave blank to auto-generate" />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <AdminSelect value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as BlogRow["status"] }))}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </AdminSelect>
            </div>
            <div>
              <FieldLabel>Author</FieldLabel>
              <AdminSelect value={form.authorId} onChange={(event) => setForm((current) => ({ ...current, authorId: event.target.value }))}>
                {authorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AdminSelect>
            </div>
            <div>
              <MediaUploader
                label="Author photo"
                hint="Optional per-post avatar shown in the public byline."
                folder="blogs/authors"
                accept="image/jpeg,image/png,image/webp"
                value={{
                  url: form.authorAvatarUrl,
                  path: form.authorAvatarPath,
                  fileName: form.title || "Author photo",
                  mimeType: "image/*",
                }}
                onUploaded={(file) =>
                  setForm((current) => ({
                    ...current,
                    authorAvatarUrl: file.url,
                    authorAvatarPath: file.path,
                  }))
                }
                onRemoved={() =>
                  setForm((current) => ({
                    ...current,
                    authorAvatarUrl: "",
                    authorAvatarPath: "",
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <AdminSelect value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}>
                <option value="">Uncategorized</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AdminSelect>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Excerpt</FieldLabel>
              <AdminTextarea rows={4} value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <MediaUploader
                label="Featured Image"
                hint="Upload the hero image used on the blog index, article header, and homepage cards."
                folder="blogs/featured"
                accept="image/*"
                value={{
                  url: form.coverImage,
                  path: form.coverImagePath,
                  fileName: form.title || "Featured image",
                  mimeType: "image/*",
                }}
                onUploaded={(file) => setForm((current) => ({ ...current, coverImage: file.url, coverImagePath: file.path }))}
                onRemoved={() => setForm((current) => ({ ...current, coverImage: "", coverImagePath: "" }))}
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Tags</FieldLabel>
              <AdminTextarea rows={4} value={form.tagsText} onChange={(event) => setForm((current) => ({ ...current, tagsText: event.target.value }))} placeholder="One tag per line" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <FieldLabel>Content</FieldLabel>
                <p className="text-xs text-slate-500">
                  Reading time: {readingTimeMinutes} min at roughly 200 words per minute.
                </p>
              </div>
              <AdminButton
                type="button"
                variant="secondary"
                icon={<Sparkles className="h-4 w-4" />}
                onClick={openAiDrawer}
              >
                Ask AI
              </AdminButton>
            </div>
            <RichTextEditor
              ref={editorRef}
              value={form.content}
              onChange={(value) => setForm((current) => ({ ...current, content: value }))}
              toolbarExtras={
                <AdminButton
                  type="button"
                  variant="secondary"
                  icon={<Sparkles className="h-4 w-4" />}
                  onClick={openAiDrawer}
                >
                  Ask AI
                </AdminButton>
              }
            />
          </div>

          <AdminCard className="overflow-hidden">
            <button
              type="button"
              onClick={() => setSeoOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-4 border-b border-white/10 px-5 py-4 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-white">SEO &amp; Metadata</p>
                <p className="mt-1 text-xs text-slate-400">
                  Control search snippets, social sharing cards, canonical URLs, and indexing behavior.
                </p>
              </div>
              {seoOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {seoOpen ? (
              <div className="grid gap-5 p-5 md:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <FieldLabel>Meta Title</FieldLabel>
                    <CharacterCounter current={form.metaTitle.length} limit={60} />
                  </div>
                  <AdminInput
                    maxLength={60}
                    value={form.metaTitle}
                    onChange={(event) => handleMetaTitleChange(event.target.value)}
                    placeholder="Optimized search title"
                  />
                </div>

                <div>
                  <FieldLabel>Focus Keyword</FieldLabel>
                  <AdminInput
                    value={form.focusKeyword}
                    onChange={(event) => setForm((current) => ({ ...current, focusKeyword: event.target.value }))}
                    placeholder="Primary keyword target"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <FieldLabel>Meta Description</FieldLabel>
                    <CharacterCounter current={form.metaDescription.length} limit={160} />
                  </div>
                  <AdminTextarea
                    rows={4}
                    maxLength={160}
                    value={form.metaDescription}
                    onChange={(event) => handleMetaDescriptionChange(event.target.value)}
                    placeholder="A concise search result summary"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <FieldLabel>OG Title</FieldLabel>
                    <CharacterCounter current={form.ogTitle.length} limit={60} />
                  </div>
                  <AdminInput
                    maxLength={60}
                    value={form.ogTitle}
                    onChange={(event) => {
                      setOgTitleDirty(true);
                      setForm((current) => ({ ...current, ogTitle: event.target.value }));
                    }}
                    placeholder="Defaults from Meta Title"
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                    Reading Time
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">{readingTimeMinutes} min</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Auto-calculated from the current word count at roughly 200 WPM.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <FieldLabel>OG Description</FieldLabel>
                    <CharacterCounter current={form.ogDescription.length} limit={160} />
                  </div>
                  <AdminTextarea
                    rows={4}
                    maxLength={160}
                    value={form.ogDescription}
                    onChange={(event) => {
                      setOgDescriptionDirty(true);
                      setForm((current) => ({ ...current, ogDescription: event.target.value }));
                    }}
                    placeholder="Defaults from Meta Description"
                  />
                </div>

                <div className="md:col-span-2">
                  <MediaUploader
                    label="OG Image"
                    hint="Separate social share image. Recommended size: 1200 x 630px."
                    folder="blogs/og"
                    accept="image/*"
                    value={{
                      url: form.ogImageUrl,
                      path: form.ogImagePath,
                      fileName: form.title || "Open Graph image",
                      mimeType: "image/*",
                    }}
                    onUploaded={(file) => setForm((current) => ({ ...current, ogImageUrl: file.url, ogImagePath: file.path }))}
                    onRemoved={() => setForm((current) => ({ ...current, ogImageUrl: "", ogImagePath: "" }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <FieldLabel>Canonical URL</FieldLabel>
                  <AdminInput
                    value={form.canonicalUrl}
                    onChange={(event) => setForm((current) => ({ ...current, canonicalUrl: event.target.value }))}
                    placeholder="Leave blank to use this post's own URL"
                  />
                </div>

                <div className="md:col-span-2">
                  <AdminCheckbox
                    checked={form.noIndex}
                    onChange={(value) => setForm((current) => ({ ...current, noIndex: value }))}
                    label="Exclude this post from search engines"
                    hint="Adds a noindex robots directive while still allowing the post to exist on the site."
                  />
                </div>
              </div>
            ) : null}
          </AdminCard>
        </div>
      </AdminModal>

      <BlogAiAssistantDrawer
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title={form.title}
        excerpt={form.excerpt}
        content={form.content}
        focusKeyword={form.focusKeyword}
        metaTitle={form.metaTitle}
        metaDescription={form.metaDescription}
        selectedText={selectedTextSnapshot}
        onApplyTitle={(value) => {
          setForm((current) => ({ ...current, title: value }));
          toast("Post title updated from AI suggestion.", "success");
        }}
        onApplyMetaTitle={(value) => {
          handleMetaTitleChange(value.slice(0, 60));
          toast("Meta title updated from AI suggestion.", "success");
        }}
        onApplyMetaDescription={applyMetaDescription}
        onApplyTags={(values) => {
          setForm((current) => ({ ...current, tagsText: values.join("\n") }));
          toast("Tags updated from AI suggestion.", "success");
        }}
        onReplaceSelection={(value) => {
          editorRef.current?.replaceSelection(value);
          setSelectedTextSnapshot("");
          toast("Selected text replaced with the AI suggestion.", "success");
        }}
      />
    </div>
  );
}
