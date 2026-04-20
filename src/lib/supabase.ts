// src/lib/supabase.ts
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/config";

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns a singleton Supabase client for browser usage.
 * Multiple instances in the browser cause auth lock contention.
 */
export function getSupabaseClient() {
  if (!client) {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    client = createBrowserClient(supabaseUrl, supabaseKey);
  }
  return client;
}

// Deprecated alias for backwards compatibility during migration, should be removed once all callers are updated.
export const createClient = getSupabaseClient;

