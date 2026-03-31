import { NextResponse } from "next/server";
import {
  ADMIN_STORAGE_BUCKET,
  deleteAdminStorageObjects,
  ensureAdminStorageBucket,
  getSupabaseAdminClient,
  isMissingStorageBucketError,
} from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

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

    const supabase = getSupabaseAdminClient();
    const safeFileName = sanitizeFileName(file.name || "upload");
    const storagePath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadFile = () =>
      supabase.storage.from(bucket).upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
        // Updated: keep uploaded assets at their original fidelity and cache aggressively.
        cacheControl: "31536000",
      });

    let { error: uploadError } = await uploadFile();

    if (uploadError && isMissingStorageBucketError(uploadError)) {
      await ensureAdminStorageBucket(bucket);
      ({ error: uploadError } = await uploadFile());
    }

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      bucket,
      path: storagePath,
      url: data.publicUrl,
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
    const bucket =
      typeof payload?.bucket === "string" && payload.bucket.trim().length > 0
        ? payload.bucket.trim()
        : ADMIN_STORAGE_BUCKET;
    const path = typeof payload?.path === "string" ? payload.path.trim() : "";

    if (!path) {
      return NextResponse.json({ error: "A storage path is required." }, { status: 400 });
    }

    await deleteAdminStorageObjects([path], bucket);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[upload] Admin delete failed.", error);
    return NextResponse.json(
      { error: "Unable to remove the uploaded file right now." },
      { status: 500 }
    );
  }
}
