"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { FileAudio, FileImage, FileText, FileVideo, Trash2, UploadCloud } from "lucide-react";
import { AdminButton, AdminCard } from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";

export type UploadedAsset = {
  bucket: string;
  path: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

function getFileIcon(mimeType?: string) {
  if (mimeType?.startsWith("image/")) return FileImage;
  if (mimeType?.startsWith("video/")) return FileVideo;
  if (mimeType?.startsWith("audio/")) return FileAudio;
  return FileText;
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

async function deleteUploadedFile(path?: string) {
  if (!path) return;

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

export function MediaUploader({
  label,
  hint,
  folder,
  accept,
  value,
  onUploaded,
  onRemoved,
}: {
  label: string;
  hint?: string;
  folder: string;
  accept: string;
  value?: { url?: string | null; path?: string | null; fileName?: string | null; mimeType?: string | null };
  onUploaded: (file: UploadedAsset) => void;
  onRemoved?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function handleUpload(file: File) {
    setBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const uploadResponse = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const uploadPayload = await parseJsonResponse(uploadResponse);

      if (
        !uploadResponse.ok ||
        typeof uploadPayload?.bucket !== "string" ||
        typeof uploadPayload?.path !== "string" ||
        typeof uploadPayload?.url !== "string"
      ) {
        throw new Error(
          typeof uploadPayload?.error === "string"
            ? uploadPayload.error
            : "Upload failed."
        );
      }

      onUploaded({
        bucket: uploadPayload.bucket,
        path: uploadPayload.path,
        url: uploadPayload.url,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
      toast("File uploaded successfully.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Upload failed. Please try again.", "error");
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleRemove() {
    setBusy(true);

    try {
      await deleteUploadedFile(value?.path || undefined);
      onRemoved?.();
      toast("File removed successfully.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to remove the file right now.", "error");
    } finally {
      setBusy(false);
    }
  }

  const FileIcon = getFileIcon(value?.mimeType || undefined);
  const isImage = Boolean(value?.mimeType?.startsWith("image/") || value?.url?.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>

      {value?.url ? (
        <AdminCard className="flex items-center gap-4 p-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
            {isImage ? (
              <Image
                src={value.url}
                alt={value.fileName || "Uploaded file"}
                fill
                quality={100}
                className="object-cover"
              />
            ) : (
              <FileIcon className="h-6 w-6 text-blue-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{value.fileName || "Uploaded file"}</p>
            <p className="text-xs text-muted-foreground">{value.mimeType || "Stored in Cloudflare storage"}</p>
          </div>
          <AdminButton
            type="button"
            variant="ghost"
            busy={busy}
            icon={<Trash2 className="h-4 w-4" />}
            onClick={handleRemove}
          >
            Remove
          </AdminButton>
        </AdminCard>
      ) : (
        <AdminCard className="border-dashed p-6">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleUpload(file);
              }
            }}
          />
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Upload to Cloudflare storage</p>
              <p className="mt-1 text-xs text-muted-foreground">Images and files go to R2, while videos go to Cloudflare Stream.</p>
            </div>
            <AdminButton
              type="button"
              busy={busy}
              icon={<UploadCloud className="h-4 w-4" />}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "Uploading" : "Choose File"}
            </AdminButton>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
