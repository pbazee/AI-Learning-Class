import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/config";
import { getBrowserSupabaseUserStorage } from "@/lib/supabase-auth-storage";

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns a singleton Supabase client for browser usage.
 * Multiple instances in the browser cause auth lock contention.
 */
export function getSupabaseClient() {
  if (!client) {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const userStorage = getBrowserSupabaseUserStorage();

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    client = createBrowserClient(supabaseUrl, supabaseKey, {
      isSingleton: true,
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        ...(userStorage ? { userStorage } : {}),
      },
    });
  }
  return client;
}

export const createClient = getSupabaseClient;

