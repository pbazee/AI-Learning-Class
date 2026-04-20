import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Download, Linkedin, Mail, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { buildCertificatePresentation, getCertificatePdfHref } from "@/lib/certificate-presenter";
import { getPublicCertificateByCode } from "@/lib/learner-records";

function CertificateLogoMark() {
  return (
    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-[radial-gradient(circle_at_30%_20%,rgba(141,180,255,0.28),transparent_45%),linear-gradient(145deg,#10203f,#0b1327)] shadow-[0_28px_80px_-42px_rgba(0,86,210,0.95)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-3xl font-black tracking-[-0.08em] text-white">
        AI
      </div>
    </div>
  );
}

export default async function CertificateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ download?: string }>;
}) {
  const [{ code }, { download }] = await Promise.all([params, searchParams]);

  if (download === "1") {
    redirect(getCertificatePdfHref(code, { download: true }));
  }

  const certificate = await getPublicCertificateByCode(code);

  if (!certificate) {
    notFound();
  }

  const requestHeaders = await headers();
  const presentation = await buildCertificatePresentation(certificate, {
    headers: requestHeaders,
  });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f8fc_0%,#edf2ff_34%,#eef2f9_100%)] dark:bg-[linear-gradient(180deg,#030712_0%,#07101d_36%,#020617_100%)]">

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,rgba(0,86,210,0.22),transparent_58%)]" />

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
          <section className="relative overflow-hidden rounded-[34px] border border-slate-200/70 bg-[#0b1327] text-white shadow-[0_42px_120px_-56px_rgba(2,6,23,0.92)] dark:border-slate-800">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(141,180,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.12),transparent_32%)]" />
            <div className="pointer-events-none absolute -right-12 top-12 h-72 w-72 rounded-full bg-primary-blue/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 bottom-0 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
            <div className="pointer-events-none absolute inset-4 rounded-[28px] border border-white/10 sm:inset-5" />

            <div className="relative p-5 sm:p-8 lg:p-12">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Link
                  href={presentation.downloadPdfHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_50px_-26px_rgba(0,86,210,0.95)] transition hover:bg-primary-blue/90"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Link>
              </div>

              <div className="mx-auto mt-8 max-w-4xl text-center sm:mt-10">
                <CertificateLogoMark />
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.34em] text-[#8db4ff] sm:text-xs">
                  OFFICIAL LEARNING CREDENTIAL
                </p>
                <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-[4.35rem] lg:leading-[0.95]">
                  Certificate of Completion
                </h1>
                <p className="mt-8 text-sm font-medium text-white/78 sm:text-base">
                  This certifies that
                </p>
                <p className="mt-4 break-words text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-[4.2rem] lg:leading-[0.96]">
                  {presentation.recipientName}
                </p>
                <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/80 sm:text-lg">
                  {presentation.completionStatement}
                </p>
              </div>

              <div className="mt-10 grid gap-6 lg:mt-14 lg:grid-cols-[minmax(0,1.15fr)_320px]">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm sm:p-7">
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8db4ff]">
                        Credential Code
                      </p>
                      <p className="mt-2 break-all font-mono text-sm text-white sm:text-base">
                        {presentation.code}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8db4ff]">
                        Issued Date
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {presentation.issuedLabel}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8db4ff]">
                        Lifetime Status
                      </p>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white">
                        <ShieldCheck className="h-4 w-4 text-[#8db4ff]" />
                        {presentation.statusLabel}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-white/10 pt-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                      Digital Signature
                    </p>
                    <div className="mt-5 max-w-[260px]">
                      <p className="text-[2rem] font-semibold italic tracking-[-0.05em] text-white">
                        AI GENIUS LAB
                      </p>
                      <div className="mt-1 h-px w-full bg-white/45" />
                      <p className="mt-3 text-sm font-medium text-white/80">
                        Admin Signature
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm sm:p-7">
                  <div className="mx-auto flex w-full max-w-[224px] items-center justify-center rounded-[28px] bg-white p-4 shadow-[0_28px_70px_-38px_rgba(2,6,23,0.8)]">
                    <img
                      src={presentation.qrDataUrl}
                      alt={`Verification QR code for ${presentation.courseTitle}`}
                      className="aspect-square w-full rounded-[18px] object-contain"
                    />
                  </div>
                  <p className="mt-6 text-2xl font-bold tracking-tight text-white">
                    Scan to Verify
                  </p>
                  <p className="mx-auto mt-3 max-w-[240px] text-sm leading-6 text-white/72">
                    Employers and teams can validate this credential online instantly.
                  </p>
                  <a
                    href={presentation.verifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block break-all text-sm font-medium text-[#8db4ff] transition hover:text-white"
                  >
                    {presentation.verifyDisplayUrl}
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto mt-6 max-w-5xl">
            <div className="rounded-[28px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_20px_60px_-46px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Share your credential
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add this certificate to your professional profiles and send a verified link.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <a
                    href={presentation.shareLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary-blue/30 hover:bg-primary-blue/5 hover:text-primary-blue"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
                  <a
                    href={presentation.shareLinks.x}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary-blue/30 hover:bg-primary-blue/5 hover:text-primary-blue"
                  >
                    <span className="inline-flex h-4 w-4 items-center justify-center text-xs font-black">
                      X
                    </span>
                    X
                  </a>
                  <a
                    href={presentation.shareLinks.email}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary-blue/30 hover:bg-primary-blue/5 hover:text-primary-blue"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

