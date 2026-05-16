const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "ai-genius-lab-assets";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

function getR2Endpoint() {
  return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

async function getR2Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");

  return new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId: R2_ACCESS_KEY,
      secretAccessKey: R2_SECRET_KEY,
    },
  });
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
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  return getR2Url(key);
}

export async function deleteFromR2(key: string) {
  const normalizedKey = key.replace(/^\/+/, "");
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: normalizedKey,
    })
  );
}

export function getR2Url(key: string): string {
  return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key.replace(/^\/+/, "")}`;
}

export function extractR2KeyFromUrl(value: string): string | null {
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return null;
  }

  try {
    const url = new URL(value);
    const r2PublicHost = R2_PUBLIC_URL ? new URL(R2_PUBLIC_URL).hostname : null;

    if (
      url.hostname.endsWith(".r2.dev") ||
      (r2PublicHost !== null && url.hostname === r2PublicHost)
    ) {
      return url.pathname.replace(/^\/+/, "");
    }
  } catch {
    return null;
  }

  return null;
}
