import { NextRequest, NextResponse } from "next/server";
import { searchCourseSuggestions } from "@/lib/data";
import { withRequestTiming } from "@/lib/server-performance";

export async function GET(request: NextRequest) {
  return withRequestTiming("api.search.courses", async () => {
    const query = request.nextUrl.searchParams.get("q")?.trim() || "";
    const limit = Math.min(
      8,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit") || "6"))
    );

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchCourseSuggestions(query, limit);
    return NextResponse.json({ results });
  });
}
