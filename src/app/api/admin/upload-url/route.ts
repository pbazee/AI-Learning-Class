import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getR2BucketName, getR2Client, getR2Url } from "@/lib/r2";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizeFolder(folder: string) {
  return folder
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
}

async function isAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return false;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true },
  });

  return dbUser?.role === "ADMIN" || dbUser?.role === "SUPER_ADMIN";
}

export async function POST(request: Request) {
  console.log("[upload-url] Cloudflare R2 env check", {
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
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: CORS_HEADERS });
    }

    const body = await request.json().catch(() => ({}));
    const filename =
      typeof body?.filename === "string" ? body.filename.trim() : "";
    const contentType =
      typeof body?.contentType === "string" && body.contentType.trim()
        ? body.contentType.trim()
        : "application/octet-stream";
    const folder = sanitizeFolder(
      typeof body?.folder === "string" && body.folder.trim()
        ? body.folder
        : "misc"
    );

    if (!filename) {
      return NextResponse.json(
        { error: "A filename is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const safeFileName = sanitizeFileName(filename || "upload");
    const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
    const bucket = getR2BucketName();
    const client = await getR2Client();
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 3600 }
    );

    return NextResponse.json(
      {
        bucket,
        key,
        publicUrl: getR2Url(key),
        url,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("[upload-url] Unable to create a presigned upload URL.", error);
    return NextResponse.json(
      { error: "Unable to prepare the upload right now. Please try again." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Max-Age": "3600",
    },
  });
}
