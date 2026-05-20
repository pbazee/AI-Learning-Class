import { NextResponse } from "next/server";
import {
  ADMIN_STORAGE_BUCKET,
  deleteAdminStorageObjects,
} from "@/lib/supabase-admin";
import { uploadVideoToStream } from "@/lib/cloudflare-stream";
import { uploadToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  console.log("[upload] Cloudflare R2 env check", {
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    accessKeyIdDefined:
      typeof (process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID) !==
      "undefined",
    secretAccessKeyDefined:
      typeof (process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY) !==
      "undefined",
    bucketName:
      process.env.CLOUDFLARE_R2_BUCKET_NAME ?? process.env.R2_BUCKET_NAME,
    publicUrl:
      process.env.CLOUDFLARE_R2_PUBLIC_URL ?? process.env.R2_PUBLIC_URL,
  });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") || "misc").trim() || "misc";
    const bucket = String(formData.get("bucket") || ADMIN_STORAGE_BUCKET).trim() || ADMIN_STORAGE_BUCKET;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file was provided." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        {
          error:
            "This legacy buffered upload route only supports small files. Use the presigned /api/admin/upload-url flow for large uploads.",
        },
        { status: 413, headers: CORS_HEADERS }
      );
    }
    const safeFileName = sanitizeFileName(file.name || "upload");
    const storagePath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const isVideo = file.type.startsWith("video/");
    const uploadResult = isVideo
      ? await uploadVideoToStream({
          file: buffer,
          name: safeFileName,
        })
      : null;
    const publicUrl = uploadResult
      ? uploadResult.playbackUrl
      : await uploadToR2({
          file: buffer,
          key: storagePath,
          contentType: file.type || "application/octet-stream",
        });
    const responsePath = uploadResult ? `stream/${uploadResult.videoId}` : storagePath;

    return NextResponse.json(
      {
        success: true,
        bucket: uploadResult ? "cloudflare-stream" : bucket,
        path: responsePath,
        url: publicUrl,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("[upload] Admin upload failed.", error);
    return NextResponse.json(
      { error: "Unable to upload the file right now. Please try again." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await request.json();
    const path = typeof payload?.path === "string" ? payload.path.trim() : "";

    if (!path) {
      return NextResponse.json(
        { error: "A storage path is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await deleteAdminStorageObjects([path]);

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[upload] Admin delete failed.", error);
    return NextResponse.json(
      { error: "Unable to remove the uploaded file right now." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
