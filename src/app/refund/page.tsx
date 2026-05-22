import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { getLegalDocument } from "@/lib/legal-documents";
import { buildSiteMetadata } from "@/lib/site-server";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getLegalDocument("refund-policy");

  return buildSiteMetadata("/refund", {
    title: document.title,
    description: document.description,
  });
}

export default async function RefundPage() {
  const document = await getLegalDocument("refund-policy");

  return <LegalDocumentPage document={document} />;
}
