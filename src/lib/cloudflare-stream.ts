const STREAM_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const STREAM_API_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN || "";

type StreamUploadResponse = {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  result?: {
    uid?: string;
  };
};

export async function uploadVideoToStream({
  file,
  name,
}: {
  file: Buffer;
  name: string;
}): Promise<{ videoId: string; playbackUrl: string }> {
  const formData = new FormData();
  const blob = new Blob([Uint8Array.from(file)]);
  formData.append("file", blob, name);

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${STREAM_ACCOUNT_ID}/stream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STREAM_API_TOKEN}`,
      },
      body: formData,
    }
  );

  const data = (await response.json()) as StreamUploadResponse;
  const videoId = data.result?.uid;

  if (!response.ok || !videoId) {
    throw new Error(data.errors?.[0]?.message || "Unable to upload the video to Cloudflare Stream.");
  }

  const playbackUrl = `https://customer-${STREAM_ACCOUNT_ID}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;

  return { videoId, playbackUrl };
}

export async function deleteVideoFromStream(videoId: string) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${STREAM_ACCOUNT_ID}/stream/${videoId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${STREAM_API_TOKEN}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error("Unable to delete the Cloudflare Stream video.");
  }
}

export function getStreamEmbedUrl(videoId: string): string {
  return `https://customer-${STREAM_ACCOUNT_ID}.cloudflarestream.com/${videoId}/iframe`;
}

export function getStreamThumbnail(videoId: string): string {
  return `https://customer-${STREAM_ACCOUNT_ID}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;
}

export function extractVideoIdFromStreamPath(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("stream/")) {
    return trimmed.slice("stream/".length) || null;
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (!url.hostname.endsWith(".cloudflarestream.com")) {
      return null;
    }

    const [videoId] = url.pathname.replace(/^\/+/, "").split("/");
    return videoId || null;
  } catch {
    return null;
  }
}
