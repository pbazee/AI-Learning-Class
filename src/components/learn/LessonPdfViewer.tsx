"use client";

import "@/lib/promise-polyfill";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PDF Viewer Component
 * Uses dynamic imports for react-pdf to prevent SSR evaluation issues.
 */

interface LessonPdfViewerProps {
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

export function LessonPdfViewer({
  file,
  lessonId,
  viewportWidth,
  onProgress,
  onLoad,
  initialPage = 1,
  maxPages,
}: LessonPdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isDocumentReady, setIsDocumentReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<number>(Math.max(1, initialPage));
  const [pdfModule, setPdfModule] = useState<any | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const initialScrollDone = useRef(false);
  const lastReportedPage = useRef<number>(Math.max(1, initialPage));
  const docKeyRef = useRef(0);

  const renderedPageCount =
    numPages == null ? 0 : maxPages ? Math.min(numPages, maxPages) : numPages;

  const pageWidth = Math.max(
    (viewportWidth || 800) - PAGE_HORIZONTAL_PADDING,
    MIN_PAGE_WIDTH
  );

  // ── Worker & Module Setup ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (typeof window === "undefined") return;

    const setup = async () => {
      try {
        // Import layers for PDF rendering
        await Promise.all([
          import("react-pdf/dist/Page/AnnotationLayer.css"),
          import("react-pdf/dist/Page/TextLayer.css"),
        ]);

        const { pdfjs, Document, Page } = await import("react-pdf");
        
        if (!cancelled && pdfjs?.GlobalWorkerOptions) {
          // Standard path for public folder worker
          pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.min.mjs`;
        }
        
        if (!cancelled) {
          setPdfModule({ Document, Page });
        }
      } catch (err) {
        console.error("[lesson-pdf-viewer] Failed to configure PDF viewer:", err);
        setDocError("Failed to initialize PDF environment.");
      }
    };

    setup();
    return () => { cancelled = true; };
  }, []);

  // ── Reset on File Change ───────────────────────────────────────────────────
  useEffect(() => {
    docKeyRef.current += 1;
    pageRefs.current.clear();
    initialScrollDone.current = false;
    lastReportedPage.current = Math.max(1, initialPage);
    setIsLoading(true);
    setIsDocumentReady(false);
    setDocError(null);
    setNumPages(null);
    setActivePage(Math.max(1, initialPage));
  }, [file, lessonId, initialPage]);

  // ── Progress Reporting ─────────────────────────────────────────────────────
  const reportProgress = useCallback(
    (page: number, total: number, force = false) => {
      if (page === lastReportedPage.current && !force) return;
      const percent = page >= total ? 100 : Math.round((page / total) * 100);
      lastReportedPage.current = page;
      onProgress(percent, page);
    },
    [onProgress]
  );

  const reportScrollProgress = useCallback(
    (container: HTMLElement, total: number) => {
      if (total === 0) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll <= 0 || scrollTop >= maxScroll - 4) {
        reportProgress(total, total, true);
        return;
      }

      const scrollFraction = scrollTop / maxScroll;
      const estimatedPage = Math.max(1, Math.min(total, Math.ceil(scrollFraction * total)));
      reportProgress(estimatedPage, total);
    },
    [reportProgress]
  );

  const handleDocumentLoadSuccess = useCallback(
    (pdf: { numPages: number }) => {
      const capturedKey = docKeyRef.current;
      const totalPages = pdf.numPages;
      const visiblePages = maxPages ? Math.min(totalPages, maxPages) : totalPages;
      const clampedPage = Math.min(Math.max(1, initialPage), Math.max(1, visiblePages));

      if (capturedKey !== docKeyRef.current) return;

      setNumPages(totalPages);
      setActivePage(clampedPage);
      lastReportedPage.current = clampedPage;
      setDocError(null);
      setIsLoading(false);
      setIsDocumentReady(true);
      onLoad?.({ numPages: totalPages });

      Promise.resolve().then(() => reportProgress(clampedPage, visiblePages, true));
    },
    [initialPage, maxPages, onLoad, reportProgress]
  );

  const handleDocumentLoadError = useCallback((loadError: Error) => {
    console.error("[lesson-pdf-viewer] Document load failed", loadError);
    setNumPages(null);
    setIsDocumentReady(false);
    setDocError(`Unable to load this PDF.\n\nDetails: ${loadError.message}`);
    setIsLoading(false);
  }, []);

  // ── Intersection Observer for Active Page ──────────────────────────────────
  useEffect(() => {
    if (!isDocumentReady || !numPages || !containerRef.current || renderedPageCount === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let nextPage = activePage;
        let largestRatio = 0;

        entries.forEach((entry) => {
          const pageNumber = Number(entry.target.getAttribute("data-page-id"));
          if (pageNumber && entry.isIntersecting && entry.intersectionRatio > largestRatio) {
            largestRatio = entry.intersectionRatio;
            nextPage = pageNumber;
          }
        });

        if (nextPage !== activePage) {
          setActivePage(nextPage);
          reportProgress(nextPage, renderedPageCount);
        }
      },
      { root: containerRef.current, threshold: [0.1, 0.35, 0.5, 0.75] }
    );

    pageRefs.current.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [activePage, isDocumentReady, numPages, renderedPageCount, reportProgress]);

  // ── Scroll Handling ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !isDocumentReady || !numPages) return;

    const container = containerRef.current;
    const total = renderedPageCount;
    let scrollTimeout: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => reportScrollProgress(container, total), 120);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(scrollTimeout);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [isDocumentReady, numPages, renderedPageCount, reportScrollProgress]);

  // ── Initial Scroll to Page ────────────────────────────────────────────────
  useEffect(() => {
    if (!isDocumentReady || !numPages || initialScrollDone.current) return;

    const visiblePages = maxPages ? Math.min(numPages, maxPages) : numPages;
    const targetPage = Math.min(Math.max(1, initialPage), Math.max(1, visiblePages));
    const pageRef = pageRefs.current.get(targetPage);

    if (!pageRef) return;

    const timer = window.setTimeout(() => {
      pageRef.scrollIntoView({ behavior: "auto", block: "start" });
      initialScrollDone.current = true;
    }, 150);

    return () => window.clearTimeout(timer);
  }, [initialPage, isDocumentReady, maxPages, numPages]);

  if (!file) return null;

  return (
    <div className="relative flex h-full min-h-[500px] w-full flex-col overflow-hidden bg-[#02040a]">
      {(isLoading || !pdfModule) && !docError ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#02040a] text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
          <p className="animate-pulse text-sm font-medium">Preparing document...</p>
        </div>
      ) : null}

      {docError ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#02040a] px-6 text-center">
          <div className="rounded-full bg-rose-500/10 p-4">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>
          <div className="max-w-xs">
            <p className="text-sm font-bold text-white">Renderer Error</p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-400">{docError}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div
        ref={containerRef}
        className={cn(
          "h-full w-full overflow-y-auto px-3 py-8 scroll-smooth sm:px-6",
          isDocumentReady ? "opacity-100" : "invisible opacity-0"
        )}
      >
        {pdfModule?.Document ? (
          <pdfModule.Document
            key={docKeyRef.current}
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
                      if (element) pageRefs.current.set(pageNumber, element);
                      else pageRefs.current.delete(pageNumber);
                    }}
                    data-page-id={pageNumber}
                    className="overflow-hidden rounded-2xl border border-white/5 bg-white shadow-2xl"
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
        ) : null}
        <div className="h-64 shrink-0" />
      </div>

      {isDocumentReady && numPages ? (
        <div className="absolute bottom-6 right-6 z-20 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 shadow-xl backdrop-blur-md">
          <p className="select-none text-[10px] font-bold uppercase tracking-widest text-white">
            Page {activePage} / {numPages}
          </p>
        </div>
      ) : null}
    </div>
  );
}