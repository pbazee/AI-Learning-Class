import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/config";
import { createServerSupabaseUserStorage } from "@/lib/supabase-auth-storage";

export type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

type ServerCookieMethods = {
  getAll: () => Array<{ name: string; value: string }>;
  setAll?: (cookiesToSet: CookieToSet[]) => void;
};

export function createSupabaseServerClientWithCookies(
  cookieMethods: ServerCookieMethods
) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      userStorage: createServerSupabaseUserStorage(),
    },
    cookies: {
      getAll() {
        return cookieMethods.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookieMethods.setAll?.(cookiesToSet);
        } catch {
          // Server component can't set cookies.
        }
      },
    },
  });
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClientWithCookies({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) =>
        cookieStore.set(name, value, options)
      );
    },
  });
}
