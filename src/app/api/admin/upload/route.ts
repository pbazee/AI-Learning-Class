import { NextResponse } from "next/server";
import {
  ADMIN_STORAGE_BUCKET,
  deleteAdminStorageObjects,
} from "@/lib/supabase-admin";
import { uploadVideoToStream } from "@/lib/cloudflare-stream";
import { uploadToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") || "misc").trim() || "misc";
    const bucket = String(formData.get("bucket") || ADMIN_STORAGE_BUCKET).trim() || ADMIN_STORAGE_BUCKET;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file was provided." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        {
          error:
            "This file is too large for the current buffered upload route. Increase the limit or add direct-to-R2 uploads before sending larger assets.",
        },
        { status: 413 }
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

    return NextResponse.json({
      success: true,
      bucket: uploadResult ? "cloudflare-stream" : bucket,
      path: responsePath,
      url: publicUrl,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });
  } catch (error) {
    console.error("[upload] Admin upload failed.", error);
    return NextResponse.json(
      { error: "Unable to upload the file right now. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await request.json();
    const path = typeof payload?.path === "string" ? payload.path.trim() : "";

    if (!path) {
      return NextResponse.json({ error: "A storage path is required." }, { status: 400 });
    }

    await deleteAdminStorageObjects([path]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[upload] Admin delete failed.", error);
    return NextResponse.json(
      { error: "Unable to remove the uploaded file right now." },
      { status: 500 }
    );
  }
}
