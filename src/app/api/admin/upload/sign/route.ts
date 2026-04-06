import { NextResponse } from "next/server";
import {
  ADMIN_STORAGE_BUCKET,
  ensureAdminStorageBucket,
  getSupabaseAdminClient,
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
    const body = await request.json().catch(() => ({}));
    const folder =
      typeof body?.folder === "string" && body.folder.trim()
        ? body.folder.trim()
        : "misc";
    const bucket =
      typeof body?.bucket === "string" && body.bucket.trim()
        ? body.bucket.trim()
        : ADMIN_STORAGE_BUCKET;
    const fileName =
      typeof body?.fileName === "string" && body.fileName.trim()
        ? body.fileName.trim()
        : "";
    const mimeType =
      typeof body?.mimeType === "string" && body.mimeType.trim()
        ? body.mimeType.trim()
        : "application/octet-stream";

    if (!fileName) {
      return NextResponse.json(
        { error: "A file name is required to prepare an upload." },
        { status: 400 }
      );
    }

    await ensureAdminStorageBucket(bucket);

    const supabase = getSupabaseAdminClient();
    const safeFileName = sanitizeFileName(fileName);
    const storagePath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (error || !data?.token) {
      throw error || new Error("Unable to create a signed upload URL.");
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      bucket,
      path: storagePath,
      token: data.token,
      signedUrl: data.signedUrl,
      url: publicData.publicUrl,
      fileName,
      mimeType,
    });
  } catch (error) {
    console.error("[upload.sign] Unable to prepare a signed upload.", error);
    return NextResponse.json(
      { error: "Unable to prepare the upload right now. Please try again." },
      { status: 500 }
    );
  }
}
