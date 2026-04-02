import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Brain, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getPublicCertificateByCode } from "@/lib/learner-records";
import { CertificatePrintTrigger } from "@/components/certificates/CertificatePrintTrigger";

export default async function CertificateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ download?: string }>;
}) {
  const [{ code }, { download }] = await Promise.all([params, searchParams]);
  const certificate = await getPublicCertificateByCode(code);

  if (!certificate) {
    notFound();
  }

  const shouldPrint = download === "1";
  const recipientName = certificate.user.name || certificate.user.email || "AI Learning Class Learner";
  const issuedLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(certificate.issuedAt));
  const certificateHref = `/certificates/${encodeURIComponent(certificate.code)}`;
  const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  const verifyUrl = publicBaseUrl ? `${publicBaseUrl}${certificateHref}` : certificateHref;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <Navbar />
      </div>
      <CertificatePrintTrigger shouldPrint={shouldPrint} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12 print:max-w-none print:px-0 print:py-0">
        <div className="relative overflow-hidden rounded-[30px] border border-primary-blue/20 bg-[#0b1730] text-white shadow-[0_40px_120px_-60px_rgba(15,23,42,0.95)] print:rounded-none print:border-0 print:shadow-none">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.28),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.05),rgba(15,23,42,0.32))]" />
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:36px_36px]" />
          <div className="pointer-events-none absolute inset-4 rounded-[24px] border border-white/10 sm:inset-5" />
          <div className="pointer-events-none absolute inset-[22px] rounded-[18px] border border-primary-blue/20" />

          <div className="relative p-6 sm:p-8 lg:p-12">
            <div className="print:hidden mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href={certificateHref}
                scroll
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.15] bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                <ExternalLink className="h-4 w-4" /> View Certificate
              </Link>
              <Link
                href={`${certificateHref}?download=1`}
                scroll
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-blue/90"
              >
                <Download className="h-4 w-4" /> Download
              </Link>
            </div>

            <div className="mx-auto max-w-4xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-primary-blue shadow-[0_24px_60px_-34px_rgba(59,130,246,0.8)]">
                <Brain className="h-8 w-8" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.34em] text-primary-blue sm:text-sm">
                AI Learning Class
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70 sm:text-xs">
                Official Learning Credential
              </p>

              <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                <Award className="h-3.5 w-3.5 text-primary-blue" />
                Certificate of Completion
              </div>

              <h1 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                Certificate of Completion
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/[0.78] sm:text-base">
                This certifies that
              </p>
              <p className="mt-4 break-words text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                {recipientName}
              </p>
              <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/[0.84] sm:text-lg">
                successfully completed <span className="font-semibold text-white">{certificate.course.title}</span>
                , demonstrating practical achievement through AI Learning Class coursework.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-start">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm sm:p-6">
                <div className="grid gap-5 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-blue">
                      Certificate Code
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-white">{certificate.code}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-blue">
                      Issued Date
                    </p>
                    <p className="mt-2 text-sm text-white">{issuedLabel}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-blue">
                      Credential Status
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-white">
                      <ShieldCheck className="h-4 w-4 text-primary-blue" />
                      Lifetime credential
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                    Digital Signature
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-2xl font-semibold italic tracking-[0.08em] text-white">AI Learning Class</p>
                      <p className="mt-1 text-sm font-medium text-white/[0.82]">Admin Signature</p>
                      <p className="mt-1 text-xs leading-6 text-white/[0.62]">
                        Authorized by the AI Learning Class credential office.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-left text-xs text-white/[0.72]">
                      <p className="font-semibold uppercase tracking-[0.18em] text-primary-blue">
                        Verify Online
                      </p>
                      <Link href={certificateHref} scroll className="mt-2 block break-all text-white transition-colors hover:text-primary-blue">
                        {verifyUrl}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 text-center backdrop-blur-sm sm:p-6">
                <div className="mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-[24px] border border-white/[0.12] bg-white p-3 shadow-[0_28px_60px_-36px_rgba(15,23,42,0.8)] sm:h-40 sm:w-40">
                  <img
                    src={qrUrl}
                    alt="Verification QR code for this certificate"
                    className="h-full w-full rounded-[16px] object-cover"
                  />
                </div>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-primary-blue">
                  Scan to verify
                </p>
                <p className="mt-2 text-sm leading-6 text-white/[0.72]">
                  Employers and teams can validate this credential online using the QR code or the verification link.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
