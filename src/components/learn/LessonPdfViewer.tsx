"use client";

import "@/lib/promise-polyfill";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Lock } from "lucide-react";

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

type PdfPageProxy = {
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void>; cancel: () => void };
};

type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  destroy?: () => Promise<void>;
};

type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: string) => { promise: Promise<PdfDocumentProxy>; destroy?: () => void };
  version: string;
};

type PdfLoadingTask = {
  promise: Promise<PdfDocumentProxy>;
  destroy?: () => void;
};

export function LessonPdfViewer({
  file,
  lessonId,
  onProgress,
  onLoad,
  initialPage = 1,
  maxPages,
  scrollRequest,
  viewportWidth,
}: LessonPdfViewerProps) {
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(Math.max(1, initialPage));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const renderTasksRef = useRef<Map<number, { cancel: () => void }>>(new Map());

  const visiblePageCount = useMemo(() => {
    if (!numPages) {
      return 0;
    }

    return maxPages ? Math.min(numPages, maxPages) : numPages;
  }, [maxPages, numPages]);

  const pageNumbers = useMemo(
    () => Array.from({ length: visiblePageCount }, (_, index) => index + 1),
    [visiblePageCount]
  );

  const pageWidth = Math.max(280, Math.floor(viewportWidth - 32));

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setPdfDocument(null);
    setNumPages(0);
    setCurrentPage(Math.max(1, initialPage));
    pageRefs.current = {};
    canvasRefs.current = {};
  }, [file, initialPage, lessonId]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PdfLoadingTask | null = null;
    let activeDocument: PdfDocumentProxy | null = null;

    async function loadPdf() {
      try {
        setIsLoading(true);
        setError(null);

        const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.min.mjs")) as unknown as PdfJsModule;
        pdfjs.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

        loadingTask = pdfjs.getDocument(file);
        const document = await loadingTask.promise;

        if (cancelled) {
          await document.destroy?.();
          return;
        }

        activeDocument = document;
        setPdfDocument(document);
        setNumPages(document.numPages);
        onLoad?.({ numPages: document.numPages });

        const safeInitialPage = Math.min(
          Math.max(1, initialPage),
          maxPages ? Math.min(document.numPages, maxPages) : document.numPages
        );
        setCurrentPage(safeInitialPage);
      } catch (loadError) {
        if (!cancelled) {
          console.error("[lesson-pdf-viewer] Failed to load PDF.", loadError);
          setError("Unable to load the PDF document. The file may be unavailable or access may be restricted.");
          setIsLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
      void activeDocument?.destroy?.();
    };
  }, [file, initialPage, maxPages, onLoad]);

  useEffect(() => {
    if (!pdfDocument || pageNumbers.length === 0) {
      return;
    }

    const document = pdfDocument;
    let cancelled = false;
    setIsLoading(true);

    async function renderPages() {
      try {
        renderTasksRef.current.forEach((task) => task.cancel());
        renderTasksRef.current.clear();

        for (const pageNumber of pageNumbers) {
          if (cancelled) {
            return;
          }

          const canvas = canvasRefs.current[pageNumber];
          if (!canvas) {
            continue;
          }

          const context = canvas.getContext("2d");
          if (!context) {
            continue;
          }

          const page = await document.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = pageWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });
          const devicePixelRatio = window.devicePixelRatio || 1;

          canvas.width = Math.floor(viewport.width * devicePixelRatio);
          canvas.height = Math.floor(viewport.height * devicePixelRatio);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
          context.clearRect(0, 0, viewport.width, viewport.height);

          const renderTask = page.render({
            canvasContext: context,
            viewport,
          });

          renderTasksRef.current.set(pageNumber, renderTask);
          await renderTask.promise;

          if (renderTasksRef.current.get(pageNumber) === renderTask) {
            renderTasksRef.current.delete(pageNumber);
          }
        }

        if (!cancelled) {
          setIsLoading(false);
          setError(null);
        }
      } catch (renderError) {
        const errorName =
          renderError && typeof renderError === "object" && "name" in renderError
            ? String(renderError.name)
            : "";

        if (!cancelled && errorName !== "RenderingCancelledException") {
          console.error("[lesson-pdf-viewer] Failed to render PDF.", renderError);
          setError("Unable to render the PDF pages right now.");
          setIsLoading(false);
        }
      }
    }

    void renderPages();

    return () => {
      cancelled = true;
      renderTasksRef.current.forEach((task) => task.cancel());
      renderTasksRef.current.clear();
    };
  }, [pageNumbers, pageWidth, pdfDocument]);

  useEffect(() => {
    if (!visiblePageCount) {
      return;
    }

    const safePage = Math.min(Math.max(1, currentPage), visiblePageCount);
    const percent =
      visiblePageCount > 1
        ? Math.round((safePage / visiblePageCount) * 100)
        : visiblePageCount === 1
          ? 100
          : 0;

    onProgress(percent, safePage, visiblePageCount);
  }, [currentPage, onProgress, visiblePageCount]);

  useEffect(() => {
    if (!containerRef.current || pageNumbers.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!mostVisibleEntry) {
          return;
        }

        const nextPage = Number((mostVisibleEntry.target as HTMLDivElement).dataset.page || 1);
        if (Number.isFinite(nextPage)) {
          setCurrentPage(nextPage);
        }
      },
      {
        root: containerRef.current,
        threshold: [0.4, 0.65, 0.85],
      }
    );

    pageNumbers.forEach((pageNumber) => {
      const element = pageRefs.current[pageNumber];
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [pageNumbers]);

  useEffect(() => {
    if (!scrollRequest) {
      return;
    }

    const targetPage = pageRefs.current[scrollRequest.page];
    if (!targetPage) {
      return;
    }

    targetPage.scrollIntoView({
      behavior: scrollRequest.behavior || "smooth",
      block: "start",
    });
    setCurrentPage(scrollRequest.page);
  }, [scrollRequest]);

  return (
    <div className="relative flex min-h-[700px] w-full flex-col overflow-hidden rounded-xl bg-[#02040a]">
      {isLoading ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#02040a] text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
          <div className="text-center">
            <p className="text-sm font-medium">Loading PDF viewer...</p>
            <p className="mt-1 text-xs text-slate-500">Rendering pages to a protected canvas view</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#02040a] px-6 text-center">
          <div className="rounded-full bg-rose-500/10 p-4">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>
          <div className="max-w-md">
            <p className="text-sm font-bold text-white">Unable to load the PDF</p>
            <p className="mt-2 text-xs leading-6 text-slate-400">{error}</p>
          </div>
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="min-h-[700px] flex-1 overflow-y-auto bg-[#0b1220] px-4 py-5"
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          {pageNumbers.map((pageNumber) => (
            <div
              key={`${lessonId}-${pageNumber}`}
              ref={(element) => {
                pageRefs.current[pageNumber] = element;
              }}
              data-page={pageNumber}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white p-4 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.85)]"
            >
              <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Page {pageNumber}</span>
                <span>{visiblePageCount} total</span>
              </div>
              <canvas
                ref={(element) => {
                  canvasRefs.current[pageNumber] = element;
                }}
                className="mx-auto block max-w-full"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 bg-black/40 px-4 py-2 backdrop-blur-sm">
        <p className="text-xs text-slate-400">
          {maxPages
            ? `Previewing first ${maxPages} pages`
            : `Viewing ${visiblePageCount || numPages || 0} pages in the protected reader`}
        </p>
        <div className="flex items-center gap-1.5 rounded-lg border border-primary-blue/20 bg-primary-blue/10 px-3 py-1.5 text-xs font-semibold text-primary-blue">
          <Lock className="h-3 w-3" />
          No download controls
        </div>
      </div>
    </div>
  );
}

export default LessonPdfViewer;
