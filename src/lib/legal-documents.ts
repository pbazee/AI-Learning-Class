import "server-only";

import { unstable_cache } from "next/cache";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { isPrismaConnectionError, isPrismaSchemaMismatchError } from "@/lib/prisma-errors";
import { PUBLIC_CACHE_TAGS } from "@/lib/cache-config";
import {
  LEGAL_DOCUMENT_DEFAULTS,
  LEGAL_DOCUMENT_SEED_LIST,
  type LegalDocumentSlug,
} from "@/lib/legal-document-defaults";

export type LegalDocumentRecord = {
  id: string;
  slug: LegalDocumentSlug;
  title: string;
  content: string;
  description: string;
  summary: string;
  route: "/privacy" | "/terms" | "/refund";
  updatedAt: Date;
};

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildFallbackDocument(slug: LegalDocumentSlug): LegalDocumentRecord {
  const fallback = LEGAL_DOCUMENT_DEFAULTS[slug];

  return {
    id: slug,
    slug,
    title: fallback.title,
    content: fallback.content,
    description: fallback.description,
    summary: fallback.summary,
    route: fallback.route,
    updatedAt: new Date("2026-05-21T00:00:00.000Z"),
  };
}

function mapLegalDocument(
  document: {
    id: string;
    slug: string;
    title: string;
    content: string;
    updatedAt: Date;
  },
  fallback: LegalDocumentRecord
): LegalDocumentRecord {
  return {
    ...fallback,
    id: document.id,
    title: document.title || fallback.title,
    content: document.content || fallback.content,
    updatedAt: document.updatedAt,
    summary: stripHtml(document.content || fallback.content).slice(0, 240),
  };
}

async function readLegalDocument(slug: LegalDocumentSlug) {
  const fallback = buildFallbackDocument(slug);

  try {
    const document = await prisma.legalDocument.findUnique({
      where: { slug },
    });

    if (!document) {
      return fallback;
    }

    return mapLegalDocument(document, fallback);
  } catch (error) {
    if (!isPrismaConnectionError(error) && !isPrismaSchemaMismatchError(error)) {
      throw error;
    }

    return fallback;
  }
}

export const getLegalDocument = unstable_cache(
  async (slug: LegalDocumentSlug) => readLegalDocument(slug),
  ["legal-document"],
  { tags: [PUBLIC_CACHE_TAGS.legalDocuments] }
);

export async function getAllLegalDocuments() {
  return Promise.all(LEGAL_DOCUMENT_SEED_LIST.map((entry) => getLegalDocument(entry.slug)));
}

export async function getRefundPolicySummary() {
  const document = await getLegalDocument("refund-policy");
  const plainText = stripHtml(document.content || document.summary);

  return {
    title: document.title,
    route: document.route,
    summary:
      plainText.length > 180 ? `${plainText.slice(0, 177).trimEnd()}...` : plainText,
    updatedAt: document.updatedAt,
    updatedAtLabel: format(document.updatedAt, "MMMM d, yyyy"),
  };
}

export function formatLegalDocumentDate(date: Date) {
  return format(date, "MMMM d, yyyy");
}
