export type ResolvedLessonAssetKind = "VIDEO" | "AUDIO" | "PDF" | "IMAGE" | "FILE";

type LessonAssetLike = {
  assetType?: string | null;
  assetUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  title?: string | null;
};

const audioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".opus"];
const videoExtensions = [".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv", ".m3u8", ".mpd"];
const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

function hasMatchingExtension(value: string, extensions: string[]) {
  return extensions.some((extension) => value.endsWith(extension));
}

function getNormalizedAssetReference(asset: LessonAssetLike) {
  return (
    asset.fileName?.trim().toLowerCase() ||
    asset.assetUrl?.trim().toLowerCase() ||
    asset.title?.trim().toLowerCase() ||
    ""
  );
}

export function sortLessonAssets<T extends { isPrimary?: boolean | null; sortOrder?: number | null }>(
  assets: T[]
) {
  return [...assets].sort((left, right) => {
    if (Boolean(left.isPrimary) !== Boolean(right.isPrimary)) {
      return left.isPrimary ? -1 : 1;
    }

    return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
  });
}

export function inferLessonAssetKind(asset: LessonAssetLike): ResolvedLessonAssetKind {
  const assetType = asset.assetType?.trim().toUpperCase();
  const mimeType = asset.mimeType?.trim().toLowerCase() || "";
  const reference = getNormalizedAssetReference(asset);

  if (assetType === "PDF" || mimeType === "application/pdf" || reference.endsWith(".pdf")) {
    return "PDF";
  }

  if (
    assetType === "IMAGE" ||
    mimeType.startsWith("image/") ||
    hasMatchingExtension(reference, imageExtensions)
  ) {
    return "IMAGE";
  }

  if (
    assetType === "VIDEO" ||
    mimeType.startsWith("video/") ||
    hasMatchingExtension(reference, videoExtensions)
  ) {
    return "VIDEO";
  }

  if (
    mimeType.startsWith("audio/") ||
    hasMatchingExtension(reference, audioExtensions)
  ) {
    return "AUDIO";
  }

  return "FILE";
}

export function inferPrimaryLessonTypeFromAsset(
  asset: LessonAssetLike | null | undefined
): "VIDEO" | "AUDIO" | "PDF" | null {
  if (!asset) {
    return null;
  }

  const kind = inferLessonAssetKind(asset);

  if (kind === "VIDEO" || kind === "AUDIO" || kind === "PDF") {
    return kind;
  }

  return null;
}

export function getLessonAssetDisplayTitle(asset: LessonAssetLike) {
  const explicitTitle = asset.title?.trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const fileName = asset.fileName?.trim();
  if (fileName) {
    return fileName;
  }

  const assetUrl = asset.assetUrl?.trim();
  if (!assetUrl) {
    return "Lesson asset";
  }

  const segments = assetUrl.split("/").filter(Boolean);
  return segments[segments.length - 1] || "Lesson asset";
}
