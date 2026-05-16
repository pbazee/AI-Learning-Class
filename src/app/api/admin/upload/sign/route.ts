import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  void request;

  try {
    return NextResponse.json({
      error: "Direct signed uploads are disabled during the Cloudflare migration. Use /api/admin/upload instead.",
    }, { status: 501 });
  } catch (error) {
    console.error("[upload.sign] Unable to prepare a signed upload.", error);
    return NextResponse.json(
      { error: "Unable to prepare the upload right now. Please try again." },
      { status: 500 }
    );
  }
}
