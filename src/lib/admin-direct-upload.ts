"use client";

export type UploadedAsset = {
  bucket: string;
  path: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type PresignedUploadPayload = {
  bucket: string;
  key: string;
  publicUrl: string;
  url: string;
};

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

async function requestPresignedUploadUrl(file: File, folder: string) {
  const response = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      folder,
    }),
  });
  const payload = await parseJsonResponse(response);

  if (
    !response.ok ||
    typeof payload?.url !== "string" ||
    typeof payload?.key !== "string" ||
    typeof payload?.publicUrl !== "string" ||
    typeof payload?.bucket !== "string"
  ) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Unable to prepare the direct upload."
    );
  }

  return payload as unknown as PresignedUploadPayload;
}

async function uploadWithProgress(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void
) {
  onProgress(15);

  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });
  } catch {
    throw new Error("Network error while uploading.");
  }

  if (!response.ok) {
    throw new Error("Upload failed before the file reached Cloudflare R2.");
  }

  onProgress(100);
}

export async function uploadAdminFileDirect({
  file,
  folder,
  onProgress,
}: {
  file: File;
  folder: string;
  onProgress: (progress: number) => void;
}): Promise<UploadedAsset> {
  const presignedUpload = await requestPresignedUploadUrl(file, folder);
  await uploadWithProgress(presignedUpload.url, file, onProgress);

  return {
    bucket: presignedUpload.bucket,
    path: presignedUpload.key,
    url: presignedUpload.publicUrl,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}
