"use client";

import "@/lib/promise-polyfill";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy-load react-pdf components to prevent pdfjs-dist from being evaluated 
// during SSR bundling, which causes "Object.defineProperty called on non-object"
import type { DocumentProps, PageProps } from "react-pdf";

// Type for the dynamically imported react-pdf module
interface ReactPdfModule {
  Document: React.ComponentType<DocumentProps>;
  Page: React.ComponentType<PageProps & { pageNumber?: number }>;
}

// Types
interface LessonPdfViewerWrapperProps {
  file: string;
  lessonId: string;
  viewportWidth: number;
  onProgress: (percent: number, lastPage: number) => void;
  onLoad?: (data: { numPages: number }) => void;
  initialPage?: number;
  maxPages?: number;
}

// Constants
const MIN_PAGE_WIDTH = 320;
const PAGE_HORIZONTAL_PADDING = 48;

// Main Wrapper Component
export function LessonPdfViewerWrapper({
  file,
  lessonId,
  viewportWidth,
  onProgress,
  onLoad,
  initialPage = 1,
  maxPages,
}: LessonPdfViewerWrapperProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<number>(Math.max(1, initialPage));
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [pdfModule, setPdfModule] = useState<ReactPdfModule | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const initialScrollDone = useRef(false);
  const lastReportedPage = useRef<number>(Math.max(1, initialPage));
  const setupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived values
  const renderedPageCount =
    numPages == null ? 0 : maxPages ? Math.min(numPages, maxPages) : numPages;

  const pageWidth = Math.max(
    (viewportWidth || 800) - PAGE_HORIZONTAL_PADDING,
    MIN_PAGE_WIDTH
  );

  // ── Worker & Module Setup ───────────────────────────────────────────────────────────
  // IMPORTANT: react-pdf and pdfjs-dist must be imported dynamically (not statically).
  // Static imports cause webpack to evaluate pdfjs-dist during bundling,
  // before the browser environment exists, triggering:
  // "Object.defineProperty called on non-object" and "Cannot read image.png"
  useEffect(() => {
    let cancelled = false;

    // Guard: Skip execution during SSR to prevent webpack from evaluating dynamic imports
    if (typeof window === "undefined") return;

    const setup = async () => {
      try {
        // Dynamically import both the CSS and the react-pdf module
        // These must be inside the effect function to prevent SSR evaluation
        await Promise.all([
          import("react-pdf/dist/Page/AnnotationLayer.css"),
          import("react-pdf/dist/Page/TextLayer.css"),
        ]);

        const { pdfjs, Document, Page } = await import("react-pdf");
        
        if (!cancelled) {
          // Set up the PDF.js worker
          if (pdfjs?.GlobalWorkerOptions) {
            pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.min.mjs`;
          }
          setPdfjsLoaded(true);
          
          // Store the Document and Page components for rendering
          setPdfModule({ Document, Page });
        }
      } catch (err) {
        console.error("[lesson-pdf-viewer-wrapper] Failed to configure PDF viewer:", err);
        if (!cancelled) {
          setError("Failed to initialize PDF viewer. Please refresh the page.");
        }
      }
    };

    setup();

    // Timeout guard: if setup stalls, surface a useful error instead of spinning forever
    setupTimerRef.current = setTimeout(() => {
      if (!cancelled && !pdfjsLoaded) {
        setError("PDF viewer setup is taking too long. Please refresh the page or try again later.");
      }
    }, 10000);

    return () => {
      cancelled = true;
      if (setupTimerRef.current) clearTimeout(setupTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Progress reporting
  const reportProgress = useCallback(
    (page: number, total: number) => {
      if (page === lastReportedPage.current) return;
      const percent = page >= total ? 100 : Math.round((page / total) * 100);
      lastReportedPage.current = page;
      onProgress(percent, page);
    },
    [onProgress]
  );

  // react-pdf callbacks
  const handleDocumentLoadSuccess = useCallback(
    (pdf: { numPages: number }) => {
      const totalPages = pdf.numPages;
      const visiblePages = maxPages ? Math.min(totalPages, maxPages) : totalPages;
      const clampedInitialPage = Math.min(
        Math.max(1, initialPage),
        Math.max(1, visiblePages)
      );

      setNumPages(totalPages);
      setActivePage(clampedInitialPage);
      lastReportedPage.current = clampedInitialPage;
      setError(null);
      setIsLoading(false);
      onLoad?.({ numPages: totalPages });
    },
    [initialPage, maxPages, onLoad]
  );

  const handleDocumentLoadError = useCallback((loadError: Error) => {
    console.error("[lesson-pdf-viewer-wrapper] Failed to load PDF document.", loadError);
    setNumPages(null);
    setError(
      `Unable to load this PDF right now. The viewer has been reset and you can retry below.\n\nTechnical details: ${loadError.message}`
    );
    setIsLoading(false);
  }, []);

  // Intersection Observer for scroll-based progress tracking
  useEffect(() => {
    if (!numPages || !containerRef.current || renderedPageCount === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let nextPage = activePage;
        let largestIntersection = 0;

        entries.forEach((entry) => {
          const pageNumber = Number(entry.target.getAttribute("data-page-id"));

          if (
            pageNumber &&
            entry.isIntersecting &&
            entry.intersectionRatio > 0.35 &&
            entry.intersectionRatio > largestIntersection
          ) {
            nextPage = pageNumber;
            largestIntersection = entry.intersectionRatio;
          }
        });

        if (nextPage !== activePage) {
          setActivePage(nextPage);
          reportProgress(nextPage, numPages);
        }
      },
      {
        root: containerRef.current,
        threshold: [0.2, 0.35, 0.5, 0.7],
      }
    );

    pageRefs.current.forEach((pageRef) => observer.observe(pageRef));

    return () => observer.disconnect();
  }, [activePage, numPages, renderedPageCount, reportProgress]);

  // Scroll to initial page on first load
  useEffect(() => {
    if (!numPages || initialScrollDone.current) return;

    const visiblePages = maxPages ? Math.min(numPages, maxPages) : numPages;
    const targetPage = Math.min(Math.max(1, initialPage), Math.max(1, visiblePages));
    const pageRef = pageRefs.current.get(targetPage);

    if (!pageRef) return;

    const timer = window.setTimeout(() => {
      pageRef.scrollIntoView({ behavior: "auto", block: "start" });
      initialScrollDone.current = true;
    }, 120);

    return () => window.clearTimeout(timer);
  }, [initialPage, maxPages, numPages]);

  // Reset refs when file/lesson changes
  useEffect(() => {
    pageRefs.current.clear();
    initialScrollDone.current = false;
    lastReportedPage.current = Math.max(1, initialPage);
    setIsLoading(true);
    setError(null);
    setNumPages(null);
    setActivePage(Math.max(1, initialPage));
  }, [file, lessonId, initialPage]);

  // Guard
  if (typeof window === "undefined" || !file) {
    return null;
  }

  // Show loading while PDF.js worker is being set up
  if (!pdfjsLoaded && !error) {
    return (
      <div className="flex h-full min-h-[500px] w-full flex-col items-center justify-center gap-4 bg-[#02040a] text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
        <div className="text-center">
          <p className="text-sm font-medium">Loading PDF viewer...</p>
          <p className="text-xs text-slate-500 mt-1">This should only take a moment</p>
        </div>
      </div>
    );
  }

  // Render
  return (
    <div className="relative flex h-full min-h-[500px] w-full flex-col overflow-hidden bg-[#02040a]">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#02040a] text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
          <p className="text-sm font-medium">Preparing document viewer...</p>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#02040a] px-6 text-center">
          <div className="rounded-full bg-rose-500/10 p-4">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>
          <div className="max-w-xs">
            <p className="text-sm font-bold text-white">Renderer Error</p>
            <p className="mt-1 whitespace-pre-wrap text-[10px] sm:text-xs text-slate-400">
              {error}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            Retry
          </button>
        </div>
      )}

      {/* Scrollable PDF content */}
      <div
        ref={containerRef}
        className={cn(
          "h-full w-full overflow-y-auto px-3 py-8 scroll-smooth sm:px-6",
          numPages ? "opacity-100" : "invisible opacity-0"
        )}
      >
        {pdfModule?.Document ? (
          <pdfModule.Document
            file={file}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={handleDocumentLoadError}
            loading={null}
            error={null}
            className="mx-auto flex max-w-4xl flex-col gap-12"
          >
            {renderedPageCount > 0 &&
              Array.from({ length: renderedPageCount }).map((_, index) => {
                const pageNumber = index + 1;

                return (
                  <div
                    key={`${lessonId}-p-${pageNumber}`}
                    ref={(element) => {
                      if (element) {
                        pageRefs.current.set(pageNumber, element);
                      } else {
                        pageRefs.current.delete(pageNumber);
                      }
                    }}
                    data-page-id={pageNumber}
                    className="overflow-hidden rounded-2xl border border-white/5 bg-white shadow-2xl transition-all duration-300"
                  >
                    <pdfModule.Page
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
                  </div>
                );
              })}
          </pdfModule.Document>
        ) : (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-blue/30 border-t-primary-blue" />
          </div>
        )}

        <div className="h-64 shrink-0" />
      </div>

      {/* Page counter pill */}
      {numPages && (
        <div className="absolute bottom-6 right-6 z-20 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 shadow-xl backdrop-blur-md transition-all duration-300">
          <p className="select-none text-[10px] font-bold uppercase tracking-widest text-white">
            Page {activePage} / {numPages}
          </p>
        </div>
      )}
    </div>
  );
}