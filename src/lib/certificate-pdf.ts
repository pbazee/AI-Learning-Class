import "server-only";

import PDFDocument from "@react-pdf/pdfkit";
import { prisma } from "@/lib/prisma";
import { getPublicCertificateByCode } from "@/lib/learner-records";
import {
  ADMIN_STORAGE_BUCKET,
  ensureAdminStorageBucket,
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";
import {
  type CertificatePresentation,
  buildCertificatePresentation,
  getCertificatePdfFileName,
} from "@/lib/certificate-presenter";
import { CERTIFICATE_PDF_CACHE_REVALIDATE_SECONDS } from "@/lib/cache-config";

type CertificateSource = Awaited<ReturnType<typeof getPublicCertificateByCode>>;
type PdfDocument = InstanceType<typeof PDFDocument>;

const PDF_COLORS = {
  background: "#071121",
  shell: "#0b1730",
  shellBorder: "#1c3156",
  panel: "#0f1d3a",
  panelBorder: "#243a63",
  accent: "#8db4ff",
  text: "#ffffff",
  muted: "#d7e0f6",
  qrFrame: "#ffffff",
} as const;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 26;
const SHELL_PADDING = 34;

function buildCertificateStoragePath(code: string) {
  return `certificates/${code}.pdf`;
}

function getCertificatePublicUrl(storagePath: string, bucket = ADMIN_STORAGE_BUCKET) {
  const supabase = getSupabaseAdminClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

export function getCertificateDownloadFileName(certificate: {
  course: { title: string };
  user: { name: string | null; email: string | null };
}) {
  const recipientName =
    certificate.user.name ||
    certificate.user.email ||
    "AI GENIUS LAB Learner";

  return getCertificatePdfFileName({
    courseTitle: certificate.course.title,
    recipientName,
  });
}

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);

  if (!match?.[1]) {
    throw new Error("The certificate QR code could not be encoded as a PNG image.");
  }

  return Buffer.from(match[1], "base64");
}

function drawRoundedPanel(
  doc: PdfDocument,
  {
    x,
    y,
    width,
    height,
    radius = 18,
    fillColor = PDF_COLORS.panel,
    strokeColor = PDF_COLORS.panelBorder,
    lineWidth = 1,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
    fillColor?: string;
    strokeColor?: string;
    lineWidth?: number;
  }
) {
  doc.save();
  doc.lineWidth(lineWidth);
  doc.fillColor(fillColor);
  doc.strokeColor(strokeColor);
  doc.roundedRect(x, y, width, height, radius).fillAndStroke();
  doc.restore();
}

function drawCenteredText(
  doc: PdfDocument,
  text: string,
  {
    x,
    y,
    width,
    font = "Helvetica",
    size = 12,
    color = PDF_COLORS.text,
    lineGap,
    opacity,
  }: {
    x: number;
    y: number;
    width: number;
    font?: string;
    size?: number;
    color?: string;
    lineGap?: number;
    opacity?: number;
  }
) {
  doc.save();
  doc.font(font);
  doc.fontSize(size);
  doc.fillColor(color);
  if (typeof opacity === "number") {
    doc.fillOpacity(opacity);
  }
  doc.text(text, x, y, {
    width,
    align: "center",
    lineGap,
  });
  doc.restore();
}

function buildCertificatePdfBuffer(
  certificate: CertificatePresentation
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      autoFirstPage: false,
      margin: 0,
      size: "A4",
      info: {
        Title: `Certificate of Completion - ${certificate.recipientName}`,
        Author: "AI GENIUS LAB",
        Subject: `Official learning credential for ${certificate.courseTitle}`,
        Creator: "AI GENIUS LAB",
        Producer: "AI GENIUS LAB",
        CreationDate: new Date(),
      },
    });

    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    document.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    document.on("error", reject);

    document.addPage({ margin: 0, size: "A4" });

    const shellX = PAGE_MARGIN;
    const shellY = PAGE_MARGIN;
    const shellWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
    const shellHeight = PAGE_HEIGHT - PAGE_MARGIN * 2;
    const contentX = shellX + SHELL_PADDING;
    const contentY = shellY + SHELL_PADDING;
    const contentWidth = shellWidth - SHELL_PADDING * 2;
    const shellBottom = shellY + shellHeight;

    document.save();
    document.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(PDF_COLORS.background);
    document.restore();

    drawRoundedPanel(document, {
      x: shellX,
      y: shellY,
      width: shellWidth,
      height: shellHeight,
      radius: 28,
      fillColor: PDF_COLORS.shell,
      strokeColor: PDF_COLORS.shellBorder,
    });

    const badgeText = "OFFICIAL LEARNING CREDENTIAL";
    document.font("Helvetica-Bold").fontSize(11);
    const badgeWidth = document.widthOfString(badgeText) + 32;
    const badgeX = shellX + (shellWidth - badgeWidth) / 2;
    const badgeY = contentY;

    document.save();
    document.lineWidth(1);
    document.fillColor(PDF_COLORS.shell);
    document.strokeColor("#2f4f86");
    document.roundedRect(badgeX, badgeY, badgeWidth, 28, 14).fillAndStroke();
    document.restore();
    drawCenteredText(document, badgeText, {
      x: badgeX,
      y: badgeY + 8,
      width: badgeWidth,
      font: "Helvetica-Bold",
      size: 11,
      color: PDF_COLORS.accent,
    });

    drawCenteredText(document, "Certificate of Completion", {
      x: contentX,
      y: badgeY + 48,
      width: contentWidth,
      font: "Helvetica-Bold",
      size: 32,
    });
    drawCenteredText(document, "AI GENIUS LAB", {
      x: contentX,
      y: badgeY + 92,
      width: contentWidth,
      size: 13,
      color: PDF_COLORS.muted,
    });
    drawCenteredText(document, "This certifies that", {
      x: contentX,
      y: badgeY + 126,
      width: contentWidth,
      size: 13,
      color: PDF_COLORS.muted,
    });
    drawCenteredText(document, certificate.recipientName, {
      x: contentX,
      y: badgeY + 152,
      width: contentWidth,
      font: "Helvetica-Bold",
      size: 28,
    });
    drawCenteredText(document, certificate.completionStatement, {
      x: contentX + 12,
      y: badgeY + 202,
      width: contentWidth - 24,
      size: 14,
      color: PDF_COLORS.muted,
      lineGap: 4,
    });

    const gridTop = badgeY + 296;
    const gridHeight = shellBottom - gridTop - 58;
    const leftWidth = 287;
    const panelGap = 18;
    const rightWidth = contentWidth - leftWidth - panelGap;
    const leftX = contentX;
    const rightX = leftX + leftWidth + panelGap;

    drawRoundedPanel(document, {
      x: leftX,
      y: gridTop,
      width: leftWidth,
      height: gridHeight,
    });
    drawRoundedPanel(document, {
      x: rightX,
      y: gridTop,
      width: rightWidth,
      height: gridHeight,
    });

    const leftInnerX = leftX + 18;
    const leftInnerWidth = leftWidth - 36;
    let currentY = gridTop + 18;

    document.font("Helvetica-Bold").fontSize(11).fillColor(PDF_COLORS.accent);
    document.text("Credential Code", leftInnerX, currentY, {
      width: leftInnerWidth,
      characterSpacing: 1.6,
    });
    currentY += 26;
    document.font("Courier").fontSize(13).fillColor(PDF_COLORS.text);
    document.text(certificate.code, leftInnerX, currentY, {
      width: leftInnerWidth,
    });

    currentY += 42;
    document.font("Helvetica-Bold").fontSize(11).fillColor(PDF_COLORS.accent);
    document.text("Issued Date", leftInnerX, currentY, {
      width: leftInnerWidth,
      characterSpacing: 1.6,
    });
    currentY += 26;
    document.font("Helvetica-Bold").fontSize(16).fillColor(PDF_COLORS.text);
    document.text(certificate.issuedLabel, leftInnerX, currentY, {
      width: leftInnerWidth,
    });

    currentY += 42;
    document.font("Helvetica-Bold").fontSize(11).fillColor(PDF_COLORS.accent);
    document.text("Lifetime Status", leftInnerX, currentY, {
      width: leftInnerWidth,
      characterSpacing: 1.6,
    });
    currentY += 26;
    document.font("Helvetica-Bold").fontSize(16).fillColor(PDF_COLORS.text);
    document.text(certificate.statusLabel, leftInnerX, currentY, {
      width: leftInnerWidth,
    });

    const signatureY = gridTop + gridHeight - 78;
    document.font("Times-Italic").fontSize(22).fillColor(PDF_COLORS.text);
    document.text("AI GENIUS LAB", leftInnerX, signatureY, {
      width: leftInnerWidth,
    });
    document.save();
    document.strokeColor(PDF_COLORS.muted);
    document.lineWidth(1);
    document.moveTo(leftInnerX, signatureY + 30).lineTo(leftInnerX + leftInnerWidth, signatureY + 30).stroke();
    document.restore();
    document.font("Helvetica").fontSize(11).fillColor(PDF_COLORS.muted);
    document.text("Admin Signature", leftInnerX, signatureY + 38, {
      width: leftInnerWidth,
    });

    const qrFrameSize = Math.min(132, rightWidth - 48);
    const qrFrameX = rightX + (rightWidth - qrFrameSize) / 2;
    const qrFrameY = gridTop + 26;

    drawRoundedPanel(document, {
      x: qrFrameX - 10,
      y: qrFrameY - 10,
      width: qrFrameSize + 20,
      height: qrFrameSize + 20,
      radius: 18,
      fillColor: PDF_COLORS.qrFrame,
      strokeColor: PDF_COLORS.qrFrame,
      lineWidth: 0,
    });
    document.image(dataUrlToBuffer(certificate.qrDataUrl), qrFrameX, qrFrameY, {
      fit: [qrFrameSize, qrFrameSize],
      align: "center",
      valign: "center",
    });

    drawCenteredText(document, "Scan to Verify", {
      x: rightX + 12,
      y: qrFrameY + qrFrameSize + 26,
      width: rightWidth - 24,
      font: "Helvetica-Bold",
      size: 13,
    });
    drawCenteredText(document, "Employers and teams can validate this credential online.", {
      x: rightX + 12,
      y: qrFrameY + qrFrameSize + 50,
      width: rightWidth - 24,
      size: 10.5,
      color: PDF_COLORS.muted,
      lineGap: 2,
    });
    drawCenteredText(document, certificate.verifyDisplayUrl, {
      x: rightX + 12,
      y: qrFrameY + qrFrameSize + 98,
      width: rightWidth - 24,
      size: 9.5,
      color: PDF_COLORS.accent,
      lineGap: 1,
    });

    document.end();
  });
}

export async function ensureCertificatePdfAsset(
  certificate: NonNullable<CertificateSource>,
  options?: Parameters<typeof buildCertificatePresentation>[1] & {
    persist?: boolean;
  }
) {
  const presentation = await buildCertificatePresentation(certificate, options);
  const pdfBuffer = await buildCertificatePdfBuffer(presentation);

  if (options?.persist === false) {
    return {
      fileName: presentation.fileName,
      pdfBuffer,
      pdfUrl: null,
    };
  }

  try {
    const bucket = await ensureAdminStorageBucket();
    const storagePath = buildCertificateStoragePath(certificate.code);
    const supabase = getSupabaseAdminClient();
    const uploadResult = await supabase.storage.from(bucket).upload(
      storagePath,
      pdfBuffer,
      {
        contentType: "application/pdf",
        upsert: true,
        cacheControl: String(CERTIFICATE_PDF_CACHE_REVALIDATE_SECONDS),
      }
    );

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    const pdfUrl = getCertificatePublicUrl(storagePath, bucket);

    await prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        pdfUrl,
      },
    });

    return {
      fileName: presentation.fileName,
      pdfBuffer,
      pdfUrl,
    };
  } catch (error) {
    console.error("[certificate-pdf] Unable to persist the generated PDF.", error);

    return {
      fileName: presentation.fileName,
      pdfBuffer,
      pdfUrl: null,
    };
  }
}

