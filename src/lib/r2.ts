import { env } from "@/lib/config";

let r2ClientPromise: Promise<any> | null = null;

function normalizeKey(value: string) {
  return value.replace(/^\/+/, "");
}

function getR2Endpoint() {
  if (env.CLOUDFLARE_R2_ENDPOINT?.trim()) {
    return env.CLOUDFLARE_R2_ENDPOINT.trim();
  }

  if (env.CLOUDFLARE_ACCOUNT_ID?.trim()) {
    return `https://${env.CLOUDFLARE_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`;
  }

  return "";
}

export function getR2BucketName() {
  const bucketName = env.R2_BUCKET_NAME?.trim();

  if (!bucketName) {
    throw new Error(
      "Cloudflare R2 bucket name is not configured. Set R2_BUCKET_NAME or CLOUDFLARE_R2_BUCKET_NAME."
    );
  }

  return bucketName;
}

export async function getR2Client() {
  if (!r2ClientPromise) {
    const { S3Client } = (await import("@aws-sdk/client-s3")) as any;
    const endpoint = getR2Endpoint();
    const accessKeyId = env.R2_ACCESS_KEY_ID?.trim() || "";
    const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim() || "";

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Cloudflare R2 is not configured. Check CLOUDFLARE_R2_ENDPOINT, R2_ACCESS_KEY_ID or CLOUDFLARE_R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY or CLOUDFLARE_R2_SECRET_ACCESS_KEY."
      );
    }

    r2ClientPromise = Promise.resolve(
      new S3Client({
        region: "auto",
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    );
  }

  return r2ClientPromise;
}

export async function uploadToR2({
  file,
  key,
  contentType,
}: {
  file: Buffer | Uint8Array;
  key: string;
  contentType: string;
}): Promise<string> {
  const { PutObjectCommand } = (await import("@aws-sdk/client-s3")) as any;
  const client = await getR2Client();
  const bucketName = getR2BucketName();

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  return getR2Url(key);
}

export async function deleteFromR2(key: string) {
  const normalizedKey = normalizeKey(key);
  const { DeleteObjectCommand } = (await import("@aws-sdk/client-s3")) as any;
  const client = await getR2Client();
  const bucketName = getR2BucketName();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: normalizedKey,
    })
  );
}

export function getR2Url(key: string): string {
  const publicUrl = env.R2_PUBLIC_URL?.trim();

  if (!publicUrl) {
    throw new Error("Cloudflare R2 public URL is not configured.");
  }

  return `${publicUrl.replace(/\/$/, "")}/${normalizeKey(key)}`;
}

export function extractR2KeyFromUrl(value: string): string | null {
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return null;
  }

  try {
    const url = new URL(value);
    const r2PublicHost = env.R2_PUBLIC_URL
      ? new URL(env.R2_PUBLIC_URL).hostname
      : null;

    if (
      url.hostname.endsWith(".r2.dev") ||
      (r2PublicHost !== null && url.hostname === r2PublicHost)
    ) {
      return normalizeKey(url.pathname);
    }
  } catch {
    return null;
  }

  return null;
}
