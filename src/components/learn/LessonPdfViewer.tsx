"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";

interface LessonPdfViewerProps {
  file: string;
  lessonId: string;
  // Kept for interface compatibility with LessonPlayerClient — not used by iframe renderer
  viewportWidth: number;
  onProgress: (percent: number, currentPage: number, totalPages: number) => void;
  onLoad?: (data: { numPages: number }) => void;
  initialPage?: number;
  maxPages?: number;
  scrollRequest?: { page: number; nonce: number; behavior?: ScrollBehavior } | null;
}

export function LessonPdfViewer({
  file,
  lessonId,
  onProgress,
  onLoad,
  initialPage = 1,
  maxPages,
  scrollRequest,
  viewportWidth: _viewportWidth,
}: LessonPdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const hasReportedLoad = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle scroll requests (placeholder for iframe implementation)
  useEffect(() => {
    if (scrollRequest && isMounted) {
      // Browsers don't allow programmatic scroll inside PDF iframes easily
      // but we keep this for consistency.
    }
  }, [scrollRequest, isMounted]);

  // Reset loading state whenever the source file changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    hasReportedLoad.current = false;
  }, [file, lessonId]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    if (!hasReportedLoad.current) {
      hasReportedLoad.current = true;
      // Report a synthetic progress value
      // totalPages = 0 means "unknown" to prevent immediate 100% completion
      const totalPages = maxPages || 0;
      const startPercent =
        initialPage > 1 && totalPages > 0 ? Math.round((initialPage / totalPages) * 100) : 1;
      onLoad?.({ numPages: totalPages });
      onProgress(startPercent, initialPage, totalPages);
    }
  }, [onLoad, onProgress, initialPage, maxPages]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setError(
      "Unable to load the PDF document. The file may be unavailable or your browser blocked it."
    );
  }, []);

  if (!file) return null;

  // Append page anchor so the browser scrolls to the resume position
  const iframeSrc = initialPage > 1 ? `${file}#page=${initialPage}` : file;

  return (
    <div className="relative flex min-h-[700px] w-full flex-col overflow-hidden rounded-xl bg-[#02040a]">
      {/* Loading overlay */}
      {isLoading && isMounted ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#02040a] text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
          <div className="text-center">
            <p className="text-sm font-medium">Preparing document viewer...</p>
            <p className="mt-1 text-xs text-slate-500">Loading your PDF</p>
          </div>
        </div>
      ) : null}

      {/* Error state */}
      {error ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#02040a] px-6 text-center">
          <div className="rounded-full bg-rose-500/10 p-4">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>
          <div className="max-w-md">
            <p className="text-sm font-bold text-white">Unable to load the PDF</p>
            <p className="mt-2 text-xs leading-6 text-slate-400">{error}</p>
            <a
              href={file}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-blue px-4 py-2 text-sm font-semibold text-white hover:bg-primary-blue/90"
            >
              <ExternalLink className="h-4 w-4" />
              Open PDF directly
            </a>
          </div>
        </div>
      ) : null}

      {/* Native iframe — only rendered client-side to avoid SSR mismatches */}
      {isMounted ? (
        <iframe
          key={`${lessonId}-${file}`}
          src={iframeSrc}
          className="h-full w-full flex-1"
          style={{ minHeight: "700px", border: "none" }}
          onLoad={handleLoad}
          onError={handleError}
          title="PDF Document Viewer"
        />
      ) : null}

      {/* Footer toolbar */}
      <div className="flex items-center justify-between border-t border-white/10 bg-black/40 px-4 py-2 backdrop-blur-sm">
        <p className="text-xs text-slate-400">
          Use browser controls to navigate pages
        </p>
        <a
          href={file}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in new tab
        </a>
      </div>
    </div>
  );
}