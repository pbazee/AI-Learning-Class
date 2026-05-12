"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  GripVertical,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { AdminButton, AdminCard, AdminInput, StatusPill } from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";
import {
  getLessonAssetDisplayTitle,
  inferLessonAssetKind,
  type ResolvedLessonAssetKind,
} from "@/lib/lesson-assets";

export type LessonAssetDraft = {
  id?: string;
  assetType: "VIDEO" | "PDF" | "FILE" | "IMAGE";
  assetUrl: string;
  assetPath: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  title: string;
  isPrimary: boolean;
  sortOrder: number;
};

type PendingUpload = {
  id: string;
  fileName: string;
  mimeType: string;
  progress: number;
  status: "uploading" | "error";
  errorMessage?: string;
};

type SignedUploadPayload = {
  bucket: string;
  path: string;
  signedUrl: string;
  token: string;
  url: string;
};

const acceptedAssetTypes = [
  "video/*",
  "audio/*",
  "application/pdf",
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".zip",
  ".txt",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
].join(",");

function createDraftId() {
  return Math.random().toString(36).slice(2, 11);
}

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function normalizeAssets(assets: LessonAssetDraft[]) {
  return assets.map((asset, index) => ({
    ...asset,
    title: asset.title.trim() || getLessonAssetDisplayTitle(asset),
    isPrimary: index === 0,
    sortOrder: index,
  }));
}

function getAssetBadge(kind: ResolvedLessonAssetKind) {
  switch (kind) {
    case "VIDEO":
      return "VIDEO";
    case "AUDIO":
      return "AUDIO";
    case "PDF":
      return "PDF";
    case "IMAGE":
      return "IMAGE";
    default:
      return "FILE";
  }
}

function getAssetIcon(kind: ResolvedLessonAssetKind) {
  switch (kind) {
    case "VIDEO":
      return FileVideo;
    case "IMAGE":
      return FileImage;
    case "AUDIO":
      return FileAudio;
    default:
      return FileText;
  }
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text };
  }
}

async function requestSignedUpload(folder: string, file: File) {
  const response = await fetch("/api/admin/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
    }),
  });
  const payload = await parseJsonResponse(response);

  if (
    !response.ok ||
    typeof payload?.path !== "string" ||
    typeof payload?.signedUrl !== "string" ||
    typeof payload?.url !== "string"
  ) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Unable to prepare the upload right now."
    );
  }

  return payload as unknown as SignedUploadPayload;
}

function uploadFileWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (progress: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress(Math.max(5, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onerror = () => reject(new Error("Network error while uploading."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }

      reject(new Error("Upload failed before the file reached storage."));
    };

    xhr.send(file);
  });
}

async function deleteUploadedFile(path?: string) {
  if (!path) {
    return;
  }

  const response = await fetch("/api/admin/upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Unable to remove the uploaded file."
    );
  }
}

export function LessonAssetsUploader({
  courseId,
  assets,
  onChange,
}: {
  courseId: string;
  assets: LessonAssetDraft[];
  onChange: (assets: LessonAssetDraft[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestAssetsRef = useRef<LessonAssetDraft[]>(assets);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [draggingAssetId, setDraggingAssetId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    latestAssetsRef.current = assets;
  }, [assets]);

  const sortedAssets = useMemo(
    () => [...assets].sort((left, right) => left.sortOrder - right.sortOrder),
    [assets]
  );

  function commitAssets(nextAssets: LessonAssetDraft[]) {
    const normalized = normalizeAssets(nextAssets);
    latestAssetsRef.current = normalized;
    onChange(normalized);
  }

  function updateAsset(assetIndex: number, patch: Partial<LessonAssetDraft>) {
    const nextAssets = sortedAssets.map((asset, index) =>
      index === assetIndex ? { ...asset, ...patch } : asset
    );
    commitAssets(nextAssets);
  }

  async function removeAsset(assetIndex: number) {
    const asset = sortedAssets[assetIndex];
    if (!asset) {
      return;
    }

    try {
      await deleteUploadedFile(asset.assetPath);
      const nextAssets = sortedAssets.filter((_, index) => index !== assetIndex);
      commitAssets(nextAssets);
      toast("Lesson asset removed.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to remove the asset.", "error");
    }
  }

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) {
      return;
    }

    const uploadRows = files.map((file) => ({
      id: createDraftId(),
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      progress: 0,
      status: "uploading" as const,
    }));

    setPendingUploads((current) => [...current, ...uploadRows]);

    await Promise.all(
      files.map(async (file, fileIndex) => {
        const pendingId = uploadRows[fileIndex].id;

        try {
          const signedUpload = await requestSignedUpload(`courses/lessons/${courseId}`, file);
          await uploadFileWithProgress(signedUpload.signedUrl, file, (progress) => {
            setPendingUploads((current) =>
              current.map((upload) =>
                upload.id === pendingId ? { ...upload, progress } : upload
              )
            );
          });

          const inferredKind = inferLessonAssetKind({
            fileName: file.name,
            mimeType: file.type,
          });
          const nextAsset: LessonAssetDraft = {
            assetType:
              inferredKind === "PDF"
                ? "PDF"
                : inferredKind === "VIDEO"
                  ? "VIDEO"
                  : inferredKind === "IMAGE"
                    ? "IMAGE"
                    : "FILE",
            assetUrl: signedUpload.url,
            assetPath: signedUpload.path,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            title: file.name,
            isPrimary: false,
            sortOrder: latestAssetsRef.current.length,
          };

          commitAssets([...latestAssetsRef.current, nextAsset]);
          setPendingUploads((current) => current.filter((upload) => upload.id !== pendingId));
        } catch (error) {
          setPendingUploads((current) =>
            current.map((upload) =>
              upload.id === pendingId
                ? {
                    ...upload,
                    status: "error",
                    errorMessage:
                      error instanceof Error ? error.message : "Upload failed.",
                  }
                : upload
            )
          );
        }
      })
    );

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptedAssetTypes}
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            void handleFiles(event.target.files);
          }
        }}
      />

      <AdminCard
        className={`border-dashed p-6 transition ${
          isDraggingOver ? "border-primary-blue/60 bg-primary-blue/10" : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingOver(false);
          if (event.dataTransfer.files?.length) {
            void handleFiles(event.dataTransfer.files);
          }
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Lesson Assets</p>
            <p className="mt-1 text-xs text-slate-400">
              Drag in multiple videos, images, audios, PDFs, and supporting files. The first item becomes the primary lesson asset.
            </p>
          </div>
          <AdminButton
            type="button"
            icon={<UploadCloud className="h-4 w-4" />}
            onClick={() => inputRef.current?.click()}
          >
            Add Files
          </AdminButton>
        </div>
      </AdminCard>

      {pendingUploads.length > 0 ? (
        <div className="space-y-3">
          {pendingUploads.map((upload) => (
            <AdminCard key={upload.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{upload.fileName}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {upload.status === "error" ? upload.errorMessage : "Uploading to storage..."}
                  </p>
                </div>
                {upload.status === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary-blue" />
                ) : (
                  <StatusPill tone="danger">Failed</StatusPill>
                )}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${
                    upload.status === "error" ? "bg-rose-500" : "bg-primary-blue"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(upload.progress, upload.status === "error" ? 100 : 0))}%` }}
                />
              </div>
            </AdminCard>
          ))}
        </div>
      ) : null}

      {sortedAssets.length > 0 ? (
        <div className="space-y-3">
          {sortedAssets.map((asset, assetIndex) => {
            const kind = inferLessonAssetKind(asset);
            const AssetIcon = getAssetIcon(kind);

            return (
              <AdminCard
                key={`${asset.id || asset.assetPath}-${assetIndex}`}
                className="p-4"
                draggable
                onDragStart={() => setDraggingAssetId(asset.id || asset.assetPath || String(assetIndex))}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  const activeId = draggingAssetId;
                  setDraggingAssetId(null);

                  if (!activeId) {
                    return;
                  }

                  const fromIndex = sortedAssets.findIndex(
                    (entry, index) =>
                      (entry.id || entry.assetPath || String(index)) === activeId
                  );

                  if (fromIndex < 0 || fromIndex === assetIndex) {
                    return;
                  }

                  commitAssets(reorderItems(sortedAssets, fromIndex, assetIndex));
                }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-black/30 p-2 text-slate-400"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                      <AssetIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">
                          {asset.fileName || getLessonAssetDisplayTitle(asset)}
                        </p>
                        <StatusPill tone="info">{getAssetBadge(kind)}</StatusPill>
                        {assetIndex === 0 ? <StatusPill tone="success">Primary</StatusPill> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-400">{asset.assetUrl}</p>
                    </div>
                  </div>

                  <AdminButton
                    type="button"
                    variant="ghost"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => void removeAsset(assetIndex)}
                  >
                    Remove
                  </AdminButton>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  {kind === "IMAGE" ? (
                    <div className="md:col-span-2">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Preview
                      </p>
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2">
                        <img
                          src={asset.assetUrl}
                          alt={asset.title || asset.fileName || "Lesson image"}
                          className="h-40 w-full rounded-xl object-cover"
                        />
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Optional title
                    </p>
                    <AdminInput
                      value={asset.title}
                      onChange={(event) =>
                        updateAsset(assetIndex, {
                          title: event.target.value,
                        })
                      }
                      placeholder="Friendly name shown to learners"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      File type
                    </p>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                      {asset.mimeType || getAssetBadge(kind)}
                    </div>
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
