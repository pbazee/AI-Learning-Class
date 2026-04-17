"use client";

/**
 * LazyPdfViewer - Completely isolated PDF viewer component
 * 
 * This component is designed to be loaded as a dynamic import with ssr: false
 * to completely avoid any SSR build-time evaluation of pdfjs-dist.
 * 
 * All react-pdf dependencies are loaded inside the component function
 * to ensure they never execute during the build process.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Ensure promise polyfill is available (must be loaded at app entry point, not here)
// import "@/lib/promise-polyfill";

interface LazyPdfViewerProps {
  file: string;
  lessonId: string;
  viewportWidth: number;
  onProgress: (percent: number, lastPage: number) => void;
  onLoad?: (data: { numPages: number }) => void;
  initialPage?: number;
  maxPages?: number;
}

const MIN_PAGE_WIDTH = 320;
const PAGE_HORIZONTAL_PADDING = 48;

export function LazyPdfViewer({
  file,
  lessonId,
  viewportWidth,
  onProgress,
  onLoad,
  initialPage = 1,
  maxPages,
}: LazyPdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<number>(Math.max(1, initialPage));
  
  // All react-pdf related state
  const [pdfReady, setPdfReady] = useState(false);
  const [Document, setDocument] = useState<any>(null);
  const [Page, setPage] = useState<any>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastReportedPage = useRef<number>(Math.max(1, initialPage));

  const renderedPageCount =
    numPages == null ? 0 : maxPages ? Math.min(numPages, maxPages) : numPages;

  const pageWidth = Math.max(
    (viewportWidth || 800) - PAGE_HORIZONTAL_PADDING,
    MIN_PAGE_WIDTH
  );

  // Initialize react-pdf - Runs only in browser
  useEffect(() => {
    let cancelled = false;
    let setupTimeout: NodeJS.Timeout | null = null;

    const initPdf = async () => {
      try {
        // Only run in browser environment
        if (typeof window === "undefined") return;

        console.log("[LazyPdfViewer] Loading react-pdf dynamically...");

        // Load CSS first (required for Page component)
        await Promise.all([
          import("react-pdf/dist/Page/AnnotationLayer.css"),
          import("react-pdf/dist/Page/TextLayer.css"),
        ]);

        // Then load react-pdf components
        const pdfLib = await import("react-pdf");
        
        if (cancelled) return;

        // Configure worker
        if (pdfLib.pdfjs?.GlobalWorkerOptions) {
          pdfLib.pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.min.mjs`;
        }

        console.log("[LazyPdfViewer] PDF worker configured, ready to render");

        setDocument(() => pdfLib.Document);
        setPage(() => pdfLib.Page);
        setPdfReady(true);
      } catch (err) {
        console.error("[LazyPdfViewer] Failed to initialize:", err);
        if (!cancelled) {
          setError("Failed to load PDF viewer. Please refresh the page.");
          setIsLoading(false);
        }
      }
    };

    // Start initialization
    initPdf();

    // Timeout protection
    setupTimeout = setTimeout(() => {
      if (!pdfReady) {
        console.warn("[LazyPdfViewer] Setup timeout, forcing ready state");
        setPdfReady(true);
      }
    }, 8000);

    return () => {
      cancelled = true;
      if (setupTimeout) clearTimeout(setupTimeout);
    };
  }, []);

  const reportProgress = useCallback(
    (page: number, total: number) => {
      if (page === lastReportedPage.current) return;
      const percent = page >= total ? 100 : Math.round((page / total) * 100);
      lastReportedPage.current = page;
      onProgress(percent, page);
    },
    [onProgress]
  );

  const handleLoadSuccess = useCallback(
    (pdf: { numPages: number }) => {
      const total = pdf.numPages;
      setNumPages(total);
      setActivePage(Math.min(Math.max(1, initialPage), total));
      setError(null);
      setIsLoading(false);
      onLoad?.({ numPages: total });
    },
    [initialPage, onLoad]
  );

  const handleLoadError = useCallback((err: Error) => {
    console.error("[LazyPdfViewer] Document error:", err);
    setError(`Unable to load PDF: ${err.message}`);
    setIsLoading(false);
  }, []);

  // Scroll-based progress tracking
  useEffect(() => {
    if (!numPages || !containerRef.current || renderedPageCount === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageId = entry.target.getAttribute("data-page-id");
            if (pageId) {
              const page = parseInt(pageId, 10);
              if (page !== activePage) {
                setActivePage(page);
                reportProgress(page, numPages);
              }
            }
          }
        });
      },
      { root: containerRef.current, threshold: 0.5 }
    );

    pageRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [numPages, renderedPageCount, activePage, reportProgress]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setNumPages(null);
    setError(null);
    setIsLoading(true);
    setActivePage(Math.max(1, initialPage));
    lastReportedPage.current = Math.max(1, initialPage);
  }, [file, lessonId, initialPage]);

  // Show loading state while PDF library initializes
  if (!pdfReady) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#02040a]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
        <p className="mt-4 text-sm font-medium text-slate-400">Loading PDF viewer...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#02040a] p-6">
        <div className="flex max-w-md flex-col items-center text-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold text-white">Unable to load PDF</h3>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-6 rounded-lg bg-primary-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-blue/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render PDF pages
  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full w-full overflow-y-auto px-3 py-8 scroll-smooth sm:px-6",
        numPages ? "opacity-100" : "invisible opacity-0"
      )}
    >
      {Document && renderedPageCount > 0 && (
        <Document
          file={file}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={handleLoadError}
          loading={null}
          error={null}
          className="mx-auto flex max-w-4xl flex-col gap-12"
        >
          {Array.from({ length: renderedPageCount }).map((_, index) => {
            const pageNumber = index + 1;
            return (
              <div
                key={`${lessonId}-p-${pageNumber}`}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNumber, el);
                  else pageRefs.current.delete(pageNumber);
                }}
                data-page-id={pageNumber}
                className="overflow-hidden rounded-2xl border border-white/5 bg-white shadow-2xl"
              >
                {Page && (
                  <Page
                    pageNumber={pageNumber}
                    width={pageWidth}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={
                      <div
                        className="flex items-center justify-center bg-white"
                        style={{ minHeight: 640, width: pageWidth }}
                      >
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-blue/30 border-t-primary-blue" />
                      </div>
                    }
                  />
                )}
              </div>
            );
          })}
        </Document>
      )}

      <div className="h-64 shrink-0" />

      {/* Page counter */}
      {numPages && (
        <div className="absolute bottom-6 right-6 z-20 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 shadow-xl backdrop-blur-md">
          <p className="select-none text-[10px] font-bold uppercase tracking-widest text-white">
            Page {activePage} / {numPages}
          </p>
        </div>
      )}
    </div>
  );
}