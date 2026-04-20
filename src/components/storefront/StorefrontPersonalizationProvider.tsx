"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { CourseAccessState } from "@/types";

type AffiliateStatus = {
  hasJoined: boolean;
  status: string | null;
};

type StorefrontPersonalizationState = {
  affiliateStatus: AffiliateStatus;
  courseAccessMap: Record<string, CourseAccessState>;
  loading: boolean;
  viewerId: string | null;
  wishlistCourseIds: string[];
};

const EMPTY_STATE: StorefrontPersonalizationState = {
  affiliateStatus: { hasJoined: false, status: null },
  courseAccessMap: {},
  loading: false,
  viewerId: null,
  wishlistCourseIds: [],
};

const StorefrontPersonalizationContext =
  createContext<StorefrontPersonalizationState>(EMPTY_STATE);

export function StorefrontPersonalizationProvider({
  children,
  courseIds,
  includeAffiliateStatus = false,
}: {
  children: ReactNode;
  courseIds: string[];
  includeAffiliateStatus?: boolean;
}) {
  const [state, setState] = useState<StorefrontPersonalizationState>(EMPTY_STATE);
  const courseIdsSignature = useMemo(
    () => Array.from(new Set(courseIds.filter(Boolean))).join(","),
    [courseIds]
  );

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;

    async function loadPersonalization() {
      setState((current) => ({ ...current, loading: true }));

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setState(EMPTY_STATE);
          }
          return;
        }

        const response = await fetch("/api/storefront/personalization", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            courseIds: courseIdsSignature ? courseIdsSignature.split(",") : [],
            includeAffiliateStatus,
          }),
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              affiliateStatus?: AffiliateStatus;
              courseAccessMap?: Record<string, CourseAccessState>;
              viewerId?: string | null;
              wishlistCourseIds?: string[];
            }
          | null;

        if (!response.ok || cancelled) {
          throw new Error("Unable to load storefront personalization.");
        }

        setState({
          affiliateStatus: payload?.affiliateStatus ?? EMPTY_STATE.affiliateStatus,
          courseAccessMap: payload?.courseAccessMap ?? {},
          loading: false,
          viewerId: payload?.viewerId ?? user.id,
          wishlistCourseIds: payload?.wishlistCourseIds ?? [],
        });
      } catch (error) {
        if (!cancelled) {
          console.error("[storefront-personalization] Unable to load.", error);
          setState((current) => ({
            ...EMPTY_STATE,
            loading: false,
            viewerId: current.viewerId,
          }));
        }
      }
    }

    void loadPersonalization();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadPersonalization();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [courseIdsSignature, includeAffiliateStatus]);

  return (
    <StorefrontPersonalizationContext.Provider value={state}>
      {children}
    </StorefrontPersonalizationContext.Provider>
  );
}

export function useStorefrontPersonalization() {
  return useContext(StorefrontPersonalizationContext);
}
