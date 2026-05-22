import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { getLegalDocument } from "@/lib/legal-documents";
import { buildSiteMetadata } from "@/lib/site-server";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getLegalDocument("terms-of-service");

  return buildSiteMetadata("/terms", {
    title: document.title,
    description: document.description,
  });
}

export default async function TermsPage() {
  const document = await getLegalDocument("terms-of-service");

  return <LegalDocumentPage document={document} />;
}
