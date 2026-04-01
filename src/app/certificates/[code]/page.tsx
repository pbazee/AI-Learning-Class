import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Download, ExternalLink, Shield } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CertificatePrintTrigger shouldPrint={shouldPrint} />

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[36px] border border-border bg-card p-8 shadow-sm sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-blue">
                Certificate of Completion
              </p>
              <h1 className="mt-4 text-4xl font-black text-foreground sm:text-5xl">
                {certificate.course.title}
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                This certifies that <span className="font-semibold text-foreground">{certificate.user.name || certificate.user.email}</span> successfully completed the course.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/certificates/${certificate.code}?download=1`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-blue px-4 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90"
              >
                <Download className="h-4 w-4" /> Download
              </Link>
              <a
                href={`/api/certificate/generate?code=${encodeURIComponent(certificate.code)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/80"
              >
                <ExternalLink className="h-4 w-4" /> Verify
              </a>
            </div>
          </div>

          <div className="mt-10 rounded-[32px] border border-primary-blue/20 bg-[linear-gradient(135deg,rgba(59,130,246,0.10),rgba(255,255,255,0.92))] p-8 dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.16),rgba(10,10,10,0.96))]">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-blue text-white shadow-[0_24px_60px_-30px_rgba(59,130,246,0.8)]">
                <Award className="h-10 w-10" />
              </div>
              <h2 className="mt-6 text-3xl font-black text-foreground">AI Learning Class</h2>
              <p className="mt-3 text-sm uppercase tracking-[0.26em] text-primary-blue">
                Official Learning Credential
              </p>
              <p className="mt-8 text-sm text-muted-foreground">Presented to</p>
              <p className="mt-2 text-3xl font-black text-foreground">
                {certificate.user.name || certificate.user.email}
              </p>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">
                For successfully completing <span className="font-semibold text-foreground">{certificate.course.title}</span> on AI Learning Class.
              </p>

              <div className="mt-10 grid w-full gap-4 rounded-[28px] border border-border bg-card/80 p-5 text-left md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-blue">Certificate Code</p>
                  <p className="mt-2 font-mono text-sm text-foreground">{certificate.code}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-blue">Issued</p>
                  <p className="mt-2 text-sm text-foreground">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(certificate.issuedAt))}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-blue">Verification</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                    <Shield className="h-4 w-4 text-primary-blue" />
                    Lifetime credential
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
