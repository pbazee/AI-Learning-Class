"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { AskAI } from "@/components/courses/AskAI";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  FileText,
  CheckCircle2,
  Sparkles,
  Loader2,
  NotebookText,
  Clock3,
  Lock,
} from "lucide-react";
import { DEFAULT_ASK_AI_NAME, clampPercentage } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";

/**
 * PDF Viewer Integration
 * Strictly Dynamic to avoid SSR issues with pdfjs-dist.
 */
const LessonPdfViewer = dynamic(
  () => import("./LessonPdfViewer").then((mod) => mod.LessonPdfViewer),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#02040a] text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-primary-blue" />
        <p className="text-xs font-medium animate-pulse">Initializing PDF environment...</p>
      </div>
    )
  }
);

type LessonPlayerNote = {
  id: string;
  content: string;
  timestamp: string;
};

type CourseLesson = NonNullable<Course["modules"]>[number]["lessons"][number];

type LessonProgressState = {
  progressPercent: number;
  watchedSeconds: number;
  lastPdfPage: number | null;
  isCompleted: boolean;
};

type LessonProgressMap = Record<string, LessonProgressState>;

const NOTES_PANEL_OPEN_KEY = "ai-genius-lab:lesson-notes-panel-open";
const DESKTOP_BREAKPOINT = 1024;
const PROGRESS_SYNC_DEBOUNCE_MS = 1200;
const LESSON_COMPLETE_THRESHOLD = 99;

function normalizeLessonProgressEntry(
  value?: Partial<LessonProgressState> | null
): LessonProgressState {
  const isCompleted = Boolean(value?.isCompleted);
  const progressPercent = clampPercentage(
    isCompleted ? 100 : value?.progressPercent ?? 0
  );

  return {
    progressPercent,
    watchedSeconds:
      typeof value?.watchedSeconds === "number" && Number.isFinite(value.watchedSeconds)
        ? Math.max(0, Math.round(value.watchedSeconds))
        : 0,
    lastPdfPage:
      typeof value?.lastPdfPage === "number" && Number.isFinite(value.lastPdfPage)
        ? Math.max(1, Math.round(value.lastPdfPage))
        : null,
    isCompleted: isCompleted || progressPercent >= 100,
  };
}

function normalizeLessonProgressMap(
  completedLessonIds: string[],
  progressMap: LessonProgressMap
) {
  const normalized = Object.fromEntries(
    Object.entries(progressMap).map(([lessonId, value]) => [
      lessonId,
      normalizeLessonProgressEntry(value),
    ])
  ) as LessonProgressMap;

  completedLessonIds.forEach((lessonId) => {
    normalized[lessonId] = normalizeLessonProgressEntry({
      ...normalized[lessonId],
      progressPercent: 100,
      isCompleted: true,
    });
  });

  return normalized;
}

function areLessonProgressStatesEqual(
  left?: LessonProgressState | null,
  right?: LessonProgressState | null
) {
  return (
    left?.progressPercent === right?.progressPercent &&
    left?.watchedSeconds === right?.watchedSeconds &&
    left?.lastPdfPage === right?.lastPdfPage &&
    left?.isCompleted === right?.isCompleted
  );
}

export function LessonPlayerClient({
  course,
  initialLessonId,
  viewerId,
  initialCompletedLessonIds,
  initialLessonProgressMap,
  initialNotes,
  initialNoteContent,
  hasFullCourseAccess,
  askAiEnabled,
  askAiAssistantLabel = DEFAULT_ASK_AI_NAME,
}: {
  course: Course;
  initialLessonId: string;
  viewerId: string | null;
  initialCompletedLessonIds: string[];
  initialLessonProgressMap: LessonProgressMap;
  initialNotes: LessonPlayerNote[];
  initialNoteContent: string;
  hasFullCourseAccess: boolean;
  askAiEnabled: boolean;
  askAiAssistantLabel?: string;
}) {
  // --- Hydration Management ---
  const [isMounted, setIsMounted] = useState(false);

  // --- UI State ---
  const modules = course.modules ?? [];
  const allLessons = useMemo(() => modules.flatMap((module) => module.lessons), [modules]);
  const isLessonUnlocked = useCallback(
    (lesson: CourseLesson) => hasFullCourseAccess || lesson.isPreview,
    [hasFullCourseAccess]
  );
  const currentLesson = allLessons.find((lesson) => lesson.id === initialLessonId) ?? allLessons[0];
  const currentIndex = allLessons.findIndex((lesson) => lesson.id === currentLesson.id);
  const currentModule = modules.find((module) =>
    module.lessons.some((lesson) => lesson.id === currentLesson.id)
  );
  const prevLesson =
    currentIndex > 0
      ? [...allLessons.slice(0, currentIndex)].reverse().find((lesson) => isLessonUnlocked(lesson))
      : undefined;
  const nextLesson =
    currentIndex >= 0
      ? allLessons.slice(currentIndex + 1).find((lesson) => isLessonUnlocked(lesson))
      : undefined;
  
  const primaryAssetUrl = currentLesson.assetUrl || currentLesson.videoUrl;
  const isPreviewOnlyLesson = currentLesson.isPreview && !hasFullCourseAccess;
  const previewPagesLimit =
    isPreviewOnlyLesson && currentLesson.type === "PDF"
      ? currentLesson.previewPages ?? undefined
      : undefined;

  // --- Preferences & Layout States (Initialized with Defaults) ---
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [lessonProgressMap, setLessonProgressMap] = useState<LessonProgressMap>(() =>
    normalizeLessonProgressMap(initialCompletedLessonIds, initialLessonProgressMap)
  );
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const initialProgress = normalizeLessonProgressEntry(initialLessonProgressMap[initialLessonId]);

  // --- PDF & Media States ---
  const [previewPdfPage, setPreviewPdfPage] = useState(initialProgress.lastPdfPage ?? 1);
  const [pdfViewportWidth, setPdfViewportWidth] = useState(0);
  const currentLessonProgress = normalizeLessonProgressEntry(lessonProgressMap[currentLesson.id]);

  // --- Refs ---
  const pdfViewportRef = useRef<HTMLDivElement | null>(null);
  const progressSyncTimeoutRef = useRef<number | null>(null);
  const queuedProgressRef = useRef<LessonProgressState | null>(null);
  const lastSyncedProgressRef = useRef<LessonProgressState>(initialProgress);

  // --- Hydration & Preference Loading ---
  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== "undefined") {
      const storedOpen = window.localStorage.getItem(NOTES_PANEL_OPEN_KEY) === "true";
      setNotesPanelOpen(storedOpen);

      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      if (!desktop) {
        setSidebarOpen(false);
      }
    }
  }, []);

  // --- Side Effects ---
  useEffect(() => {
    if (!isMounted) return;
    window.localStorage.setItem(NOTES_PANEL_OPEN_KEY, String(notesPanelOpen));
  }, [notesPanelOpen, isMounted]);

  useEffect(() => {
    const nextPreviewPage = currentLessonProgress.lastPdfPage ?? 1;
    setPreviewPdfPage(nextPreviewPage);
    queuedProgressRef.current = null;
    lastSyncedProgressRef.current = currentLessonProgress;
  }, [currentLesson.id]);

  useEffect(() => {
    if (!isMounted || currentLesson.type !== "PDF" || !pdfViewportRef.current) {
      return;
    }

    const viewportElement = pdfViewportRef.current;
    const syncViewportWidth = () => {
      const nextWidth = Math.max(0, Math.round(viewportElement.clientWidth));
      setPdfViewportWidth((current) => (current === nextWidth ? current : nextWidth));
    };

    syncViewportWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncViewportWidth);
      return () => window.removeEventListener("resize", syncViewportWidth);
    }

    const observer = new ResizeObserver(() => syncViewportWidth());
    observer.observe(viewportElement);

    return () => observer.disconnect();
  }, [currentLesson.id, currentLesson.type, isMounted]);

  // Initial Data Fetch / Touch
  useEffect(() => {
    if (!viewerId || !hasFullCourseAccess || !isMounted) return;

    // Coordinated touch: Only fires once per lesson per mount
    void fetch(`/api/learn/lessons/${currentLesson.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ touchOnly: true }),
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (res.ok && payload?.progress) {
          setLessonProgressMap(
            normalizeLessonProgressMap(
              payload.progress.completedLessonIds ?? [],
              payload.progress.lessonProgressByLessonId ?? {}
            )
          );
        }
      })
      .catch(() => {});
  }, [currentLesson.id, hasFullCourseAccess, viewerId, isMounted]);

  // --- Handlers ---
  const flushPendingLessonProgress = useCallback(
    (lessonId: string) => {
      if (!viewerId || !hasFullCourseAccess) {
        return;
      }

      const pendingProgress = queuedProgressRef.current;
      if (
        !pendingProgress ||
        areLessonProgressStatesEqual(pendingProgress, lastSyncedProgressRef.current)
      ) {
        return;
      }

      const body = JSON.stringify(pendingProgress);
      queuedProgressRef.current = null;

      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const sent = navigator.sendBeacon(
          `/api/learn/lessons/${lessonId}/progress`,
          new Blob([body], { type: "application/json" })
        );

        if (sent) {
          lastSyncedProgressRef.current = pendingProgress;
          return;
        }
      }

      void fetch(`/api/learn/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      })
        .then((response) => {
          if (response.ok) {
            lastSyncedProgressRef.current = pendingProgress;
            return;
          }

          queuedProgressRef.current = pendingProgress;
        })
        .catch(() => {
          queuedProgressRef.current = pendingProgress;
        });
    },
    [hasFullCourseAccess, viewerId]
  );

  const queueLessonProgressSync = useCallback((snapshot: LessonProgressState) => {
    if (!viewerId || !hasFullCourseAccess) return;

    if (areLessonProgressStatesEqual(snapshot, lastSyncedProgressRef.current)) {
      return;
    }

    if (progressSyncTimeoutRef.current) {
      window.clearTimeout(progressSyncTimeoutRef.current);
    }

    queuedProgressRef.current = snapshot;

    progressSyncTimeoutRef.current = window.setTimeout(async () => {
      const toSync = queuedProgressRef.current;
      if (!toSync || areLessonProgressStatesEqual(toSync, lastSyncedProgressRef.current)) {
        return;
      }

      try {
        const res = await fetch(`/api/learn/lessons/${currentLesson.id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSync),
        });
        if (res.ok) {
          lastSyncedProgressRef.current = toSync;
          queuedProgressRef.current = null;
        }
      } catch {}
    }, PROGRESS_SYNC_DEBOUNCE_MS);
  }, [currentLesson.id, hasFullCourseAccess, viewerId]);

  const handlePdfProgressUpdate = useCallback((percent: number, page: number) => {
    setPreviewPdfPage(page);
    if (!hasFullCourseAccess || !viewerId) return;

    const normalized = normalizeLessonProgressEntry({
      ...lessonProgressMap[currentLesson.id],
      progressPercent: percent >= LESSON_COMPLETE_THRESHOLD ? 100 : percent,
      lastPdfPage: page,
      isCompleted: percent >= LESSON_COMPLETE_THRESHOLD,
    });

    setLessonProgressMap((current) => ({ ...current, [currentLesson.id]: normalized }));
    queueLessonProgressSync(normalized);
  }, [currentLesson.id, hasFullCourseAccess, lessonProgressMap, queueLessonProgressSync, viewerId]);

  useEffect(() => {
    return () => {
      if (progressSyncTimeoutRef.current) {
        window.clearTimeout(progressSyncTimeoutRef.current);
        progressSyncTimeoutRef.current = null;
      }

      flushPendingLessonProgress(currentLesson.id);
    };
  }, [currentLesson.id, flushPendingLessonProgress]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const handlePageHide = () => flushPendingLessonProgress(currentLesson.id);
    window.addEventListener("pagehide", handlePageHide);

    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [currentLesson.id, flushPendingLessonProgress, isMounted]);

  // --- Render Guard (The Hydration Fix) ---
  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04070d]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
      </div>
    );
  }

  const hasPdfPreviewLimit = Boolean(previewPagesLimit && previewPagesLimit > 0);
  const pdfPreviewMaxed = Boolean(hasPdfPreviewLimit && previewPagesLimit && previewPdfPage >= previewPagesLimit);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#04070d] text-slate-100">
      {/* Header */}
      <header className="z-40 flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-[#04070d]/80 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden h-6 w-px bg-white/10 sm:block" />
          <Link href={`/courses/${course.slug}`} className="group flex items-center gap-2">
            <h1 className="max-w-[120px] truncate text-sm font-bold text-white transition-colors group-hover:text-primary-blue sm:max-w-xs">
              {course.title}
            </h1>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {askAiEnabled && (
            <button
              onClick={() => setAskAiOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-primary-blue/10 px-4 py-2 text-xs font-bold text-primary-blue transition-all hover:bg-primary-blue/20"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          )}
          <div className="hidden h-6 w-px bg-white/10 sm:block" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setNotesPanelOpen(!notesPanelOpen)}
              className={cn(
                "rounded-lg p-2 transition-colors",
                notesPanelOpen ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <NotebookText className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
              {/* Asset Viewer */}
              <div ref={pdfViewportRef} className="relative mb-12 aspect-video min-h-[500px] overflow-hidden rounded-3xl border border-white/5 bg-black/40 shadow-2xl">
                {currentLesson.type === "PDF" && primaryAssetUrl ? (
                  <LessonPdfViewer
                    key={currentLesson.id}
                    file={primaryAssetUrl}
                    lessonId={currentLesson.id}
                    viewportWidth={pdfViewportWidth || 800}
                    initialPage={currentLessonProgress.lastPdfPage || 1}
                    onProgress={handlePdfProgressUpdate}
                    maxPages={hasPdfPreviewLimit ? previewPagesLimit : undefined}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    <FileText className="mr-2 h-10 w-10 opacity-20" />
                    <p>Asset renderer not available</p>
                  </div>
                )}
                
                {pdfPreviewMaxed && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 p-8 text-center backdrop-blur-sm">
                    <Lock className="mb-4 h-12 w-12 text-primary-blue" />
                    <h3 className="mb-2 text-xl font-bold">Preview Limit Reached</h3>
                    <p className="mb-6 max-w-md text-sm text-slate-400">
                      You've read the first {previewPagesLimit} pages of this lesson. 
                      Unlock the full course to continue reading.
                    </p>
                    <Link href={`/courses/${course.slug}`} className="rounded-xl bg-primary-blue px-6 py-3 font-bold text-white hover:bg-primary-blue/90">
                      Unlock Full Access
                    </Link>
                  </div>
                )}
              </div>

              {/* Lesson Info */}
              <div className="mb-12">
                <div className="mb-4 flex items-center gap-3">
                  <span className="rounded-full bg-primary-blue/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-blue">
                    Lesson {currentIndex + 1}
                  </span>
                  <div className="h-1 w-1 rounded-full bg-slate-700" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {currentModule?.title}
                  </span>
                </div>
                <h2 className="mb-6 text-3xl font-extrabold text-white sm:text-4xl">
                  {currentLesson.title}
                </h2>
                <div className="flex flex-wrap gap-4 border-y border-white/5 py-6">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock3 className="h-4 w-4" />
                    <span className="text-xs font-medium">{currentLesson.duration || "5m read"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-medium">{currentLesson.type} Content</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation Bar */}
          <div className="border-t border-white/5 bg-[#04070d]/60 p-4 backdrop-blur-md">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
              {prevLesson ? (
                <Link href={`/learn/${course.slug}/${prevLesson.id}`} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/5">
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Link>
              ) : <div />}
              
              {nextLesson ? (
                <Link href={`/learn/${course.slug}/${nextLesson.id}`} className="flex items-center gap-2 rounded-xl bg-white px-5 py-2 text-sm font-bold text-black hover:bg-slate-200">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <div className="flex items-center gap-2 text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-widest">Course Complete</span>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Floating AI Panel */}
        <AnimatePresence>
          {askAiOpen && (
            <AskAI 
              courseTitle={course.title}
              assistantLabel={askAiAssistantLabel}
              onClose={() => setAskAiOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
