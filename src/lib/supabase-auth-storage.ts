import type { SupportedStorage } from "@supabase/auth-js";

function createMapStorage(): SupportedStorage {
  const store = new Map<string, string>();

  return {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

export function createServerSupabaseUserStorage() {
  return createMapStorage();
}

export function getBrowserSupabaseUserStorage(): SupportedStorage | undefined {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return undefined;
  }

  return {
    getItem(key) {
      return window.localStorage.getItem(key);
    },
    setItem(key, value) {
      window.localStorage.setItem(key, value);
    },
    removeItem(key) {
      window.localStorage.removeItem(key);
    },
  };
}
