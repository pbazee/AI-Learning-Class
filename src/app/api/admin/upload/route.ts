import { NextResponse } from "next/server";
import {
  ADMIN_STORAGE_BUCKET,
  deleteAdminStorageObjects,
} from "@/lib/supabase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { uploadVideoToStream } from "@/lib/cloudflare-stream";
import { checkRateLimit, uploadRatelimit } from "@/lib/rate-limit";
import { uploadToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
] as const;
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, "_");
}

function getRequestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });
    }

    const limited = await checkRateLimit(uploadRatelimit, getRequestIp(request));
    if (limited) {
      return new Response("Too many requests", { status: 429, headers: CORS_HEADERS });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") || "misc").trim() || "misc";
    const bucket = String(formData.get("bucket") || ADMIN_STORAGE_BUCKET).trim() || ADMIN_STORAGE_BUCKET;

    if (!(file instanceof File)) {
      return new Response("No file provided", { status: 400, headers: CORS_HEADERS });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return new Response("File type not allowed", { status: 415, headers: CORS_HEADERS });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response("File too large", { status: 413, headers: CORS_HEADERS });
    }

    const safeName = sanitizeFileName(file.name || "upload");
    const storagePath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const isVideo = file.type.startsWith("video/");
    const uploadResult = isVideo
      ? await uploadVideoToStream({
          file: buffer,
          name: safeName,
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
        fileName: safeName,
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
    if (!(await isAdmin())) {
      return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });
    }

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
    status: 204,
    headers: CORS_HEADERS,
  });
}
