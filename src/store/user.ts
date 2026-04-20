"use client";

import type { User } from "@supabase/supabase-js";
import { create } from "zustand";

type UserAuthState = {
  user: User | null;
  userRole: string | null;
  authResolved: boolean;
  syncInitiated: boolean;
  setUser: (user: User | null) => void;
  setUserRole: (role: string | null) => void;
  setAuthResolved: (resolved: boolean) => void;
  setSyncInitiated: (initiated: boolean) => void;
};

export const useUserAuthStore = create<UserAuthState>((set) => ({
  user: null,
  userRole: null,
  authResolved: false,
  syncInitiated: false,
  setUser: (user) => set({ user }),
  setUserRole: (userRole) => set({ userRole }),
  setAuthResolved: (authResolved) => set({ authResolved }),
  setSyncInitiated: (syncInitiated) => set({ syncInitiated }),
}));
