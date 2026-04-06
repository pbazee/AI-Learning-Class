import "server-only";

import QRCode from "qrcode";

const issuedDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

type CertificatePresentationSource = {
  code: string;
  issuedAt: Date;
  course: {
    title: string;
    slug: string;
  };
  user: {
    name: string | null;
    email: string | null;
  };
};

export type CertificatePresentation = {
  code: string;
  courseTitle: string;
  recipientName: string;
  issuedLabel: string;
  statusLabel: string;
  completionStatement: string;
  certificateHref: string;
  verifyUrl: string;
  verifyDisplayUrl: string;
  viewPdfHref: string;
  downloadPdfHref: string;
  fileName: string;
  qrDataUrl: string;
  shareLinks: {
    linkedin: string;
    x: string;
    email: string;
  };
};

function getAppOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function getCertificatePdfFileName(input: {
  courseTitle: string;
  recipientName: string;
}) {
  return `ai-learning-class-certificate-${slugify(input.recipientName)}-${slugify(input.courseTitle) || "course"}.pdf`;
}

export function getCertificateHref(code: string) {
  return `/certificates/${encodeURIComponent(code)}`;
}

export function getCertificatePdfHref(code: string, options?: { download?: boolean }) {
  const href = `/api/certificates/${encodeURIComponent(code)}/pdf`;
  return options?.download ? `${href}?download=1` : href;
}

export function getCertificateVerifyUrl(code: string) {
  return `${getAppOrigin()}${getCertificateHref(code)}`;
}

export async function buildCertificatePresentation(
  certificate: CertificatePresentationSource
): Promise<CertificatePresentation> {
  const recipientName = certificate.user.name || certificate.user.email || "AI Learning Class Learner";
  const courseTitle = certificate.course.title;
  const issuedLabel = issuedDateFormatter.format(new Date(certificate.issuedAt));
  const certificateHref = getCertificateHref(certificate.code);
  const verifyUrl = getCertificateVerifyUrl(certificate.code);
  const verifyDisplayUrl = verifyUrl.replace(/^https?:\/\//, "");
  const viewPdfHref = getCertificatePdfHref(certificate.code);
  const downloadPdfHref = getCertificatePdfHref(certificate.code, { download: true });
  const completionStatement = `successfully completed ${courseTitle}, demonstrating practical achievement through AI Learning Class coursework.`;
  const fileName = getCertificatePdfFileName({
    courseTitle,
    recipientName,
  });
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: "H",
    margin: 1,
    scale: 10,
    color: {
      dark: "#0b1327",
      light: "#ffffff",
    },
  });

  const shareTitle = `I earned the ${courseTitle} certificate on AI Learning Class`;
  const shareBody = `${shareTitle}. Verify it here: ${verifyUrl}`;

  return {
    code: certificate.code,
    courseTitle,
    recipientName,
    issuedLabel,
    statusLabel: "Lifetime",
    completionStatement,
    certificateHref,
    verifyUrl,
    verifyDisplayUrl,
    viewPdfHref,
    downloadPdfHref,
    fileName,
    qrDataUrl,
    shareLinks: {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(verifyUrl)}`,
      email: `mailto:?subject=${encodeURIComponent("My AI Learning Class Certificate")}&body=${encodeURIComponent(shareBody)}`,
    },
  };
}
