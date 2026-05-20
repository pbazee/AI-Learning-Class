import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  void request;

  try {
    return NextResponse.json(
      {
        error:
          "This legacy endpoint has been replaced. Request a presigned upload from /api/admin/upload-url instead.",
      },
      { status: 410 }
    );
  } catch (error) {
    console.error("[upload.sign] Unable to prepare a signed upload.", error);
    return NextResponse.json(
      { error: "Unable to prepare the upload right now. Please try again." },
      { status: 500 }
    );
  }
}
