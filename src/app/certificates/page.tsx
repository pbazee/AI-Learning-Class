import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Award, Shield } from "lucide-react";
import { CertificateCardActions } from "@/components/certificates/CertificateCardActions";
import { getCurrentUserProfile, getUserCertificates } from "@/lib/data";

export default async function CertificatesPage() {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/login?redirect=/certificates");
  }

  const certificates = await getUserCertificates(user.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/40">
                <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl font-black text-foreground">My Certificates</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Your earned certificates of completion. Each includes a unique credential ID for verification.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          {certificates.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Award className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">No certificates yet</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Complete a course to earn your first certificate.
              </p>
              <Link
                href="/courses"
                className="rounded-xl bg-primary-blue px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-blue/90"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {certificates.map((certificate) => (
                <div key={certificate.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40">
                        <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="mb-1 font-bold text-foreground">{certificate.course.title}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Issued: <strong className="text-foreground">{certificate.issuedAt}</strong>
                          </span>
                          <span>Expires: <strong className="text-foreground">Never</strong></span>
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            ID: <strong className="font-mono text-foreground">{certificate.code}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                    <CertificateCardActions code={certificate.code} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-primary-blue/20 bg-primary-blue/10 p-5">
            <h4 className="mb-1 text-sm font-semibold text-foreground">About your certificates</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              All AI Learning Class certificates are lifetime credentials. Share the certificate code with employers or on LinkedIn to verify authenticity.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
