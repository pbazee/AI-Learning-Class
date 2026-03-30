import { createClient } from "@supabase/supabase-js";

export const ADMIN_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "admin-assets";

type SupabaseAdminClient = ReturnType<typeof createClient>;

const globalForSupabaseAdmin = globalThis as unknown as {
  supabaseAdmin?: SupabaseAdminClient;
};

export function getSupabaseAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase storage is not configured for admin uploads.");
  }

  if (!globalForSupabaseAdmin.supabaseAdmin) {
    globalForSupabaseAdmin.supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
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

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).remove(validPaths);

  if (error) {
    console.warn("[storage] Failed to remove one or more admin assets.", error);
  }
}
