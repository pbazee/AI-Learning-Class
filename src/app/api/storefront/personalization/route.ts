import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserWishlistCourseIds } from "@/lib/learner-records";
import {
  getUserAffiliateStatus,
  getUserCourseAccessMap,
} from "@/lib/data";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import { withRequestTiming } from "@/lib/server-performance";

const requestSchema = z.object({
  courseIds: z.array(z.string()).default([]),
  includeAffiliateStatus: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  return withRequestTiming("api.storefront.personalization", async () => {
    try {
      const body = requestSchema.parse(await request.json().catch(() => ({})));
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return NextResponse.json({
          affiliateStatus: { hasJoined: false, status: null },
          courseAccessMap: {},
          viewerId: null,
          wishlistCourseIds: [],
        });
      }

      const profile = await syncAuthenticatedUser(user);

      if (!profile) {
        return NextResponse.json(
          { error: "Unable to verify the current learner." },
          { status: 400 }
        );
      }

      const courseIds = Array.from(new Set(body.courseIds.filter(Boolean)));
      const [courseAccessMap, wishlistCourseIds, affiliateStatus] = await Promise.all([
        getUserCourseAccessMap(profile.id, courseIds),
        getUserWishlistCourseIds(profile.id, courseIds),
        body.includeAffiliateStatus
          ? getUserAffiliateStatus(profile.id)
          : Promise.resolve({ hasJoined: false, status: null as string | null }),
      ]);

      return NextResponse.json({
        affiliateStatus,
        courseAccessMap,
        viewerId: profile.id,
        wishlistCourseIds,
      });
    } catch (error) {
      console.error(
        "[storefront-personalization] Unable to resolve personalization.",
        error
      );
      return NextResponse.json(
        { error: "Unable to load personalized storefront state right now." },
        { status: 500 }
      );
    }
  });
}
