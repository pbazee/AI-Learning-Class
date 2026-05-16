import { createClient } from "@supabase/supabase-js";
import { deleteVideoFromStream, extractVideoIdFromStreamPath } from "@/lib/cloudflare-stream";
import { env } from "@/lib/config";
import { deleteFromR2, extractR2KeyFromUrl } from "@/lib/r2";

export const ADMIN_STORAGE_BUCKET = env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "admin-assets";

type SupabaseAdminClient = ReturnType<typeof createClient>;

const globalForSupabaseAdmin = globalThis as unknown as {
  supabaseAdmin?: SupabaseAdminClient;
};

export function getSupabaseAdminClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase storage is not configured for admin uploads.");
  }

  if (!globalForSupabaseAdmin.supabaseAdmin) {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    globalForSupabaseAdmin.supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return globalForSupabaseAdmin.supabaseAdmin;
}

export async function ensureAdminStorageBucket(bucket = ADMIN_STORAGE_BUCKET) {
  const supabase = getSupabaseAdminClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw listError;
  }

  const exists = buckets.some((entry) => entry.name === bucket);

  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: true,
    });

    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw createError;
    }
  }

  return bucket;
}

export function isMissingStorageBucketError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.toLowerCase().includes("bucket not found");
}

export async function deleteAdminStorageObjects(paths: Array<string | null | undefined>, bucket = ADMIN_STORAGE_BUCKET) {
  const validPaths = paths.filter((path): path is string => Boolean(path));

  if (validPaths.length === 0) {
    return;
  }

  const supabaseFallbackPaths: string[] = [];

  for (const path of validPaths) {
    const streamVideoId = extractVideoIdFromStreamPath(path);

    if (streamVideoId) {
      try {
        await deleteVideoFromStream(streamVideoId);
      } catch (error) {
        console.warn("[storage] Failed to remove a Cloudflare Stream asset.", error);
      }
      continue;
    }

    const r2Key = extractR2KeyFromUrl(path);

    if (r2Key) {
      try {
        await deleteFromR2(r2Key);
      } catch (error) {
        console.warn("[storage] Failed to remove an R2 asset.", error);
      }
      continue;
    }

    try {
      await deleteFromR2(path);
      continue;
    } catch {
      supabaseFallbackPaths.push(path);
    }
  }

  if (supabaseFallbackPaths.length === 0) {
    return;
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[storage] Supabase storage is not configured for legacy asset cleanup.");
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).remove(supabaseFallbackPaths);

  if (error) {
    console.warn("[storage] Failed to remove one or more legacy Supabase assets.", error);
  }
}
