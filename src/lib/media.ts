const DEFAULT_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "admin-assets";

function normalizeValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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

  const supabaseUrl = normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!supabaseUrl) {
    return normalizedPath;
  }

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${normalizedPath.replace(/^\/+/, "")}`;
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
  return normalizeValue(url) || resolveSupabaseStorageUrl(path, bucket) || fallback;
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
