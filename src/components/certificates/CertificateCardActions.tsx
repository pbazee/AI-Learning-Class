"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Download, ExternalLink, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export function CertificateCardActions({
  code,
}: {
  code: string;
}) {
  const { toast } = useToast();
  const router = useRouter();

  const certificateHref = useMemo(() => `/certificates/${encodeURIComponent(code)}`, [code]);
  const downloadHref = useMemo(() => `/api/certificates/${encodeURIComponent(code)}/pdf?download=1`, [code]);

  function navigateTo(href: string) {
    router.push(href, { scroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  async function handleShare() {
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${certificateHref}` : certificateHref;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "AI Learning Class Certificate",
          text: `View certificate ${code}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast("Certificate link copied.", "success");
      }
    } catch {
      // No toast on cancelled native share.
    }
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => navigateTo(certificateHref)}
        className="inline-flex items-center gap-2 rounded-lg border border-primary-blue/20 bg-primary-blue/10 px-4 py-2 text-sm font-medium text-primary-blue transition-colors hover:bg-primary-blue/15"
      >
        <ExternalLink className="h-4 w-4" /> View Certificate
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
      <Link
        href={downloadHref}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
      >
        <Download className="h-4 w-4" /> Download
      </Link>
    </div>
  );
}
