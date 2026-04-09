import { NextRequest, NextResponse } from "next/server";
import { ensureCertificatePdfAsset, getCertificateDownloadFileName } from "@/lib/certificate-pdf";
import { CERTIFICATE_PDF_CACHE_REVALIDATE_SECONDS } from "@/lib/cache-config";
import { getPublicCertificateByCode } from "@/lib/learner-records";
import { withRequestTiming } from "@/lib/server-performance";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  return withRequestTiming("api.certificates.pdf", async () => {
    try {
      const { code } = await params;
      const certificate = await getPublicCertificateByCode(code);

      if (!certificate) {
        return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
      }

      const dispositionType =
        request.nextUrl.searchParams.get("download") === "1"
          ? "attachment"
          : "inline";
      const fileName = getCertificateDownloadFileName(certificate);

      // Rebuild from the current request origin so saved localhost URLs never leak
      // into downloaded or inline certificate PDFs.
      const generated = await ensureCertificatePdfAsset(certificate, {
        headers: request.headers,
        requestUrl: request.url,
        persist: false,
      });
      const pdfBytes = new Uint8Array(generated.pdfBuffer);

      return new NextResponse(pdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": String(generated.pdfBuffer.byteLength),
          "Content-Disposition": `${dispositionType}; filename="${generated.fileName}"`,
          "Cache-Control": `public, max-age=${CERTIFICATE_PDF_CACHE_REVALIDATE_SECONDS}, stale-while-revalidate=${CERTIFICATE_PDF_CACHE_REVALIDATE_SECONDS}`,
        },
      });
    } catch (error) {
      console.error("[certificates.pdf] Unable to generate certificate PDF.", error);
      return NextResponse.json(
        { error: "Unable to generate this certificate PDF right now." },
        { status: 500 }
      );
    }
  });
}
