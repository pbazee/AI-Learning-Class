"use client";

import { startTransition, useState } from "react";
import { Edit3, ImageIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteBlogAction, saveBlogAction } from "@/app/admin/actions";
import { MediaUploader } from "@/components/admin/media-uploader";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  AdminButton,
  AdminCard,
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

type BlogRow = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverImage?: string | null;
  coverImagePath?: string | null;
  authorId: string;
  authorName: string;
  categoryId?: string | null;
  categoryName?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  tags: string[];
  publishedAt?: string | null;
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
  const [form, setForm] = useState({
    id: "",
    title: "",
    slug: "",
    excerpt: "",
    content: "<p></p>",
    coverImage: "",
    coverImagePath: "",
    authorId: authorOptions[0]?.value || "",
    categoryId: "",
    status: "DRAFT" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    tagsText: "",
  });
  const router = useRouter();
  const { toast } = useToast();

  function openCreate() {
    setForm({
      id: "",
      title: "",
      slug: "",
      excerpt: "",
      content: "<p></p>",
      coverImage: "",
      coverImagePath: "",
      authorId: authorOptions[0]?.value || "",
      categoryId: "",
      status: "DRAFT",
      tagsText: "",
    });
    setOpen(true);
  }

  function openEdit(post: BlogRow) {
    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      coverImage: post.coverImage || "",
      coverImagePath: post.coverImagePath || "",
      authorId: post.authorId,
      categoryId: post.categoryId || "",
      status: post.status,
      tagsText: toLines(post.tags),
    });
    setOpen(true);
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
        authorId: form.authorId,
        categoryId: form.categoryId || null,
        status: form.status,
        tags: fromLines(form.tagsText),
      });
      setBusy(false);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        setOpen(false);
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

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Blogs"
        description="Publish research breakdowns, career articles, and launch content with rich text, authors, and featured images."
        actions={<CreateButton onClick={openCreate}>New Blog Post</CreateButton>}
      />

      <AdminStatGrid>
        <AdminStatCard label="Total Posts" value={posts.length} />
        <AdminStatCard label="Published" value={posts.filter((post) => post.status === "PUBLISHED").length} />
        <AdminStatCard label="Drafts" value={posts.filter((post) => post.status === "DRAFT").length} />
        <AdminStatCard label="Categories" value={new Set(posts.map((post) => post.categoryName).filter(Boolean)).size} />
      </AdminStatGrid>

      {posts.length === 0 ? (
        <EmptyState title="No posts yet" description="Write your first article to populate the storefront blog and homepage journal section." action={<CreateButton onClick={openCreate}>Create Blog Post</CreateButton>} />
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
        onClose={() => setOpen(false)}
        title={form.id ? "Edit Blog Post" : "Create Blog Post"}
        description="Draft rich content, choose the author and category, then publish when it is ready."
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <AdminButton type="button" variant="secondary" onClick={() => setOpen(false)}>
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

          <div>
            <FieldLabel>Content</FieldLabel>
            <RichTextEditor value={form.content} onChange={(value) => setForm((current) => ({ ...current, content: value }))} />
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
