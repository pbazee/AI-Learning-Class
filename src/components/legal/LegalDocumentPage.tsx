import { sanitizeHtml } from "@/lib/sanitize";
import { formatLegalDocumentDate, type LegalDocumentRecord } from "@/lib/legal-documents";
import { Footer } from "@/components/layout/Footer";

export function LegalDocumentPage({ document }: { document: LegalDocumentRecord }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-3 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-blue">
            Legal
          </p>
          <h1 className="mt-3 text-4xl font-black text-foreground">{document.title}</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{document.summary}</p>
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Last updated: {formatLegalDocumentDate(document.updatedAt)}
          </p>
        </div>

        <div
          className="prose prose-slate max-w-none space-y-8 text-sm leading-7 text-muted-foreground prose-headings:font-black prose-headings:text-foreground prose-h2:text-2xl prose-p:text-muted-foreground prose-a:text-primary-blue"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(document.content),
          }}
        />
      </main>
      <Footer />
    </div>
  );
}
