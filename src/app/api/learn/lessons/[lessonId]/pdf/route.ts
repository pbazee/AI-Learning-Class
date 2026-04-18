import { NextResponse } from "next/server";
import { getUserCourseAccessMap } from "@/lib/data";
import { resolveAppOrigin } from "@/lib/app-origin";
import { resolveMediaUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";

function isPdfSource(sourceUrl?: string | null, lessonType?: string | null) {
  if (lessonType?.trim().toUpperCase() === "PDF") {
    return true;
  }

  return /\.pdf(?:[?#].*)?$/i.test(sourceUrl?.trim() ?? "");
}

async function resolveAuthenticatedProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return syncAuthenticatedUser(user);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        type: true,
        videoUrl: true,
        assetUrl: true,
        assetPath: true,
        isPreview: true,
        module: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    if (!lesson.isPreview) {
      const profile = await resolveAuthenticatedProfile();

      if (!profile) {
        return NextResponse.json(
          { error: "Please sign in to access this lesson PDF." },
          { status: 401 }
        );
      }

      const accessMap = await getUserCourseAccessMap(profile.id, [lesson.module.courseId]);

      if (!accessMap[lesson.module.courseId]?.hasAccess) {
        return NextResponse.json(
          { error: "You do not have access to this lesson yet." },
          { status: 403 }
        );
      }
    }

    const sourceUrl =
      resolveMediaUrl({
        url: lesson.assetUrl || lesson.videoUrl,
        path: lesson.assetPath,
        fallback: "",
      }) || null;

    if (!sourceUrl || !isPdfSource(sourceUrl, lesson.type)) {
      return NextResponse.json(
        { error: "This lesson does not have a classroom-ready PDF asset." },
        { status: 400 }
      );
    }

    const absoluteSourceUrl = new URL(
      sourceUrl,
      resolveAppOrigin({
        requestUrl: request.url,
        headers: request.headers,
      })
    ).toString();
    const upstreamHeaders = new Headers();
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      upstreamHeaders.set("range", rangeHeader);
    }

    upstreamHeaders.set("accept", "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8");

    const upstreamResponse = await fetch(absoluteSourceUrl, {
      headers: upstreamHeaders,
      redirect: "follow",
      cache: "no-store",
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      console.error("[learn.lesson.pdf] Upstream PDF request failed.", {
        lessonId,
        sourceUrl: absoluteSourceUrl,
        status: upstreamResponse.status,
      });

      return NextResponse.json(
        { error: "Unable to fetch this lesson PDF right now." },
        { status: 502 }
      );
    }

    const responseHeaders = new Headers();
    const upstreamContentType = upstreamResponse.headers.get("content-type");

    responseHeaders.set(
      "Content-Type",
      upstreamContentType && upstreamContentType.trim()
        ? upstreamContentType
        : "application/pdf"
    );
    responseHeaders.set("Content-Disposition", 'inline; filename="lesson.pdf"');
    responseHeaders.set("Cache-Control", "private, no-store, max-age=0");

    [
      "accept-ranges",
      "content-length",
      "content-range",
      "etag",
      "last-modified",
    ].forEach((headerName) => {
      const headerValue = upstreamResponse.headers.get(headerName);

      if (headerValue) {
        responseHeaders.set(headerName, headerValue);
      }
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[learn.lesson.pdf] Unable to stream lesson PDF.", error);

    return NextResponse.json(
      { error: "Unable to open this lesson PDF right now." },
      { status: 500 }
    );
  }
}
