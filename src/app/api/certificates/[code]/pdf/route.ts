import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createCertificatePdfDocument } from "@/components/certificates/CertificatePdfDocument";
import { buildCertificatePresentation } from "@/lib/certificate-presenter";
import { getPublicCertificateByCode } from "@/lib/learner-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const certificate = await getPublicCertificateByCode(code);

  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  }

  const presentation = await buildCertificatePresentation(certificate);
  const pdfBuffer = await renderToBuffer(createCertificatePdfDocument(presentation));
  const pdfBytes = new Uint8Array(pdfBuffer);
  const dispositionType = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdfBuffer.byteLength),
      "Content-Disposition": `${dispositionType}; filename="${presentation.fileName}"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
