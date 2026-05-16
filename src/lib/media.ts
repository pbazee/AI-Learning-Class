import { env } from "@/lib/config";

const DEFAULT_STORAGE_BUCKET = env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "admin-assets";
const DEFAULT_R2_PUBLIC_URL = env.R2_PUBLIC_URL?.replace(/\/$/, "") || "";

function normalizeValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizePath(value: string) {
  return value.replace(/^\/+/, "");
}

function buildLegacySupabaseUrl(path: string, bucket = DEFAULT_STORAGE_BUCKET) {
  const supabaseUrl = normalizeValue(env.NEXT_PUBLIC_SUPABASE_URL);
  if (!supabaseUrl) {
    return path;
  }

  const normalizedPath = normalizePath(path);
  const pathWithBucket =
    normalizedPath.startsWith(`${bucket}/`) || normalizedPath.startsWith("admin-assets/")
      ? normalizedPath
      : `${bucket}/${normalizedPath}`;

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${pathWithBucket}`;
}

export function getMediaUrl(path: string, type: "file" | "video" = "file"): string {
  if (!path) return "";

  const normalizedPath = normalizeValue(path);
  if (!normalizedPath) {
    return "";
  }

  if (normalizedPath.startsWith("http")) {
    return normalizedPath;
  }

  if (
    normalizedPath.startsWith("admin-assets/") ||
    normalizedPath.includes("supabase") ||
    normalizedPath.startsWith(`${DEFAULT_STORAGE_BUCKET}/`)
  ) {
    return buildLegacySupabaseUrl(normalizedPath);
  }

  if (!DEFAULT_R2_PUBLIC_URL) {
    return type === "video" ? normalizedPath : buildLegacySupabaseUrl(normalizedPath);
  }

  return `${DEFAULT_R2_PUBLIC_URL}/${normalizePath(normalizedPath)}`;
}

export function resolveSupabaseStorageUrl(
  path?: string | null,
  bucket = DEFAULT_STORAGE_BUCKET
) {
  const normalizedPath = normalizeValue(path);
  if (!normalizedPath) {
    return undefined;
  }

  if (
    normalizedPath.startsWith("/") ||
    normalizedPath.startsWith("http://") ||
    normalizedPath.startsWith("https://")
  ) {
    return normalizedPath;
  }

  return buildLegacySupabaseUrl(normalizedPath, bucket);
}

export function resolveMediaUrl({
  url,
  path,
  fallback,
  bucket,
}: {
  url?: string | null;
  path?: string | null;
  fallback: string;
  bucket?: string;
}) {
  const normalizedUrl = normalizeValue(url);
  const normalizedPath = normalizeValue(path);

  if (normalizedUrl) {
    return normalizedUrl;
  }

  if (!normalizedPath) {
    return fallback;
  }

  if (
    normalizedPath.startsWith("admin-assets/") ||
    normalizedPath.includes("supabase") ||
    normalizedPath.startsWith(`${bucket || DEFAULT_STORAGE_BUCKET}/`)
  ) {
    return resolveSupabaseStorageUrl(normalizedPath, bucket) || fallback;
  }

  return getMediaUrl(normalizedPath) || fallback;
}

export function appendMediaVersion(
  url?: string | null,
  version?: number | string | Date | null
) {
  const normalizedUrl = normalizeValue(url);

  if (!normalizedUrl || version == null) {
    return normalizedUrl;
  }

  const resolvedVersion =
    version instanceof Date ? version.getTime() : String(version).trim();

  if (!resolvedVersion) {
    return normalizedUrl;
  }

  const separator = normalizedUrl.includes("?") ? "&" : "?";
  return `${normalizedUrl}${separator}v=${resolvedVersion}`;
}
