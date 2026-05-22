import { LegalPagesManager } from "@/components/admin/legal-pages-manager";
import { getAllLegalDocuments, formatLegalDocumentDate } from "@/lib/legal-documents";

export default async function AdminLegalPagesPage() {
  const documents = await getAllLegalDocuments();

  return (
    <LegalPagesManager
      documents={documents.map((document) => ({
        slug: document.slug,
        title: document.title,
        route: document.route,
        content: document.content,
        updatedAtLabel: formatLegalDocumentDate(document.updatedAt),
      }))}
    />
  );
}
