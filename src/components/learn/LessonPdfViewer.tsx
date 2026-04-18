"use client";

import "@/lib/promise-polyfill";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// CSS imports are safe at the top level — they contain no JavaScript
// and will never call browser APIs. Only the pdfjs JS must be lazy-loaded.
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

const MIN_PAGE_WIDTH = 320;
const PAGE_HORIZONTAL_PADDING = 48;
const VISIBILITY_THRESHOLDS = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1];

export type LessonPdfViewerHandle = {
  scrollToPage: (page: number, behavior?: ScrollBehavior) => void;
  getCurrentPage: () => number;
};

interface LessonPdfViewerProps {
  file: string;
  lessonId: string;
  viewportWidth: number;
  onProgress: (percent: number, currentPage: number, totalPages: number) => void;
  onLoad?: (data: { numPages: number }) => void;
  initialPage?: number;
  maxPages?: number;
  scrollRequest?: { page: number; nonce: number; behavior?: ScrollBehavior } | null;
}

type PdfComponents = {
  Document: React.ComponentType<any>;
  Page: React.ComponentType<any>;
};

export function LessonPdfViewer({
  file,
  lessonId,
  viewportWidth,
  onProgress,
  onLoad,
  initialPage = 1,
  maxPages,
  scrollRequest,
}: LessonPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const visibilityRatiosRef = useRef<Map<number, number>>(new Map());
  const initialScrollDoneRef = useRef(false);
  const lastReportedPageRef = useRef(Math.max(1, initialPage));

  const [pdfComponents, setPdfComponents] = useState<PdfComponents | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(Math.max(1, initialPage));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only the JS is loaded lazily — CSS is safe to import statically above.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { Document, Page, pdfjs } = await import("react-pdf");

        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

        if (!cancelled) {
          setPdfComponents({ Document, Page });
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[lesson-pdf-viewer] Failed to load react-pdf.", err);
          setError("Failed to initialise the PDF viewer. Please refresh and try again.");
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const renderedPageCount =
    numPages == null ? 0 : maxPages ? Math.min(numPages, maxPages) : numPages;

  const pageWidth = useMemo(
    () => Math.max((viewportWidth || 800) - PAGE_HORIZONTAL_PADDING, MIN_PAGE_WIDTH),
    [viewportWidth]
  );

  const reportProgress = useCallback(
    (page: number, totalPages: number, force = false) => {
      if (totalPages <= 0) return;
      if (!force && page === lastReportedPageRef.current) return;
      lastReportedPageRef.current = page;
      const percent = page >= totalPages ? 100 : Math.round((page / totalPages) * 100);
      onProgress(percent, page, totalPages);
    },
    [onProgress]
  );

  const scrollToPage = useCallback(
    (page: number, behavior: ScrollBehavior = "smooth") => {
      const maxVisiblePage = renderedPageCount || numPages || 1;
      const nextPage = Math.max(1, Math.min(page, maxVisiblePage));
      const element = pageRefs.current.get(nextPage);
      if (!element) return;
      element.scrollIntoView({ behavior, block: "start" });
      setCurrentPage(nextPage);
      reportProgress(nextPage, maxVisiblePage, true);
    },
    [numPages, renderedPageCount, reportProgress]
  );

  useEffect(() => {
    pageRefs.current.clear();
    visibilityRatiosRef.current.clear();
    initialScrollDoneRef.current = false;
    lastReportedPageRef.current = Math.max(1, initialPage);
    setNumPages(null);
    setCurrentPage(Math.max(1, initialPage));
    setIsLoading(true);
    setError(null);
  }, [file, initialPage, lessonId]);

  const handleDocumentLoadSuccess = useCallback(
    (pdf: { numPages: number }) => {
      const visiblePageCount = maxPages ? Math.min(pdf.numPages, maxPages) : pdf.numPages;
      const startingPage = Math.min(Math.max(1, initialPage), Math.max(1, visiblePageCount));
      setNumPages(pdf.numPages);
      setCurrentPage(startingPage);
      setIsLoading(false);
      setError(null);
      onLoad?.({ numPages: pdf.numPages });
      reportProgress(startingPage, visiblePageCount, true);
    },
    [initialPage, maxPages, onLoad, reportProgress]
  );

  const handleDocumentLoadError = useCallback((loadError: Error) => {
    console.error("[lesson-pdf-viewer] Failed to load PDF.", loadError);
    setNumPages(null);
    setIsLoading(false);
    setError(
      loadError.message ||
        "Unable to load the PDF renderer. Please refresh the page and try again."
    );
  }, []);

  useEffect(() => {
    if (!containerRef.current || renderedPageCount === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let nextPage = currentPage;
        let highestRatio = visibilityRatiosRef.current.get(currentPage) ?? 0;

        for (const entry of entries) {
          const pageNumber = Number(entry.target.getAttribute("data-page-id"));
          if (!pageNumber) continue;
          visibilityRatiosRef.current.set(
            pageNumber,
            entry.isIntersecting ? entry.intersectionRatio : 0
          );
        }

        for (const [pageNumber, ratio] of visibilityRatiosRef.current.entries()) {
          if (ratio > highestRatio) {
            highestRatio = ratio;
            nextPage = pageNumber;
          }
        }

        if (nextPage !== currentPage) {
          setCurrentPage(nextPage);
          reportProgress(nextPage, renderedPageCount);
        }
      },
      {
        root: containerRef.current,
        threshold: VISIBILITY_THRESHOLDS,
      }
    );

    for (const pageRef of pageRefs.current.values()) {
      observer.observe(pageRef);
    }

    return () => observer.disconnect();
  }, [currentPage, renderedPageCount, reportProgress]);

  useEffect(() => {
    if (!numPages || initialScrollDoneRef.current || renderedPageCount === 0) return;
    const startingPage = Math.min(Math.max(1, initialPage), Math.max(1, renderedPageCount));
    const timer = window.setTimeout(() => {
      scrollToPage(startingPage, "auto");
      initialScrollDoneRef.current = true;
    }, 120);
    return () => window.clearTimeout(timer);
  }, [initialPage, numPages, renderedPageCount, scrollToPage]);

  useEffect(() => {
    if (!scrollRequest) return;
    scrollToPage(scrollRequest.page, scrollRequest.behavior ?? "smooth");
  }, [scrollRequest, scrollToPage]);

  if (!file) return null;

  const { Document, Page } = pdfComponents ?? {};

  return (
    <div className="relative flex h-full min-h-[500px] w-full flex-col overflow-hidden bg-[#02040a]">
      {isLoading ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#02040a] text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
          <div className="text-center">
            <p className="text-sm font-medium">Preparing document viewer...</p>
            <p className="mt-1 text-xs text-slate-500">
              Loading pages for smooth vertical reading
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#02040a] px-6 text-center">
          <div className="rounded-full bg-rose-500/10 p-4">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>
          <div className="max-w-md">
            <p className="text-sm font-bold text-white">Unable to load the PDF renderer</p>
            <p className="mt-2 text-xs leading-6 text-slate-400">{error}</p>
          </div>
        </div>
      ) : null}

      {Document && Page ? (
        <div
          ref={containerRef}
          className={cn(
            "h-full w-full overflow-y-auto px-3 py-8 scroll-smooth sm:px-6",
            numPages ? "opacity-100" : "invisible opacity-0"
          )}
        >
          <Document
            file={file}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={handleDocumentLoadError}
            loading={null}
            error={null}
            className="mx-auto flex max-w-4xl flex-col gap-12"
          >
            {renderedPageCount > 0
              ? Array.from({ length: renderedPageCount }).map((_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <div
                      key={`${lessonId}-page-${pageNumber}`}
                      ref={(element) => {
                        if (element) {
                          pageRefs.current.set(pageNumber, element);
                        } else {
                          pageRefs.current.delete(pageNumber);
                        }
                      }}
                      data-page-id={pageNumber}
                      className="overflow-hidden rounded-2xl border border-white/5 bg-white shadow-2xl"
                    >
                      <Page
                        pageNumber={pageNumber}
                        width={pageWidth}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
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
                })
              : null}
          </Document>
          <div className="h-64 shrink-0" />
        </div>
      ) : null}

      {numPages ? (
        <div className="absolute bottom-6 right-6 z-20 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 shadow-xl backdrop-blur-md">
          <p className="select-none text-[10px] font-bold uppercase tracking-widest text-white">
            Page {currentPage} / {numPages}
          </p>
        </div>
      ) : null}
    </div>
  );
}