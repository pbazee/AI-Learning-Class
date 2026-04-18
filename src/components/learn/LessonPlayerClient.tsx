"use client";

import React, { type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";

import { AskAI } from "@/components/courses/AskAI";
import {
  AlertCircle,
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
  PlayCircle,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clampPercentage, DEFAULT_ASK_AI_NAME } from "@/lib/site";
import type { Course } from "@/types";
import { resolveMediaUrl } from "@/lib/media";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LessonNotesPanel } from "./LessonNotesPanel";

/**
 * PDF Viewer Integration
 */
const LessonPdfViewerWrapper = dynamic(
  () => import("./LessonPdfViewerLazy").then((mod) => mod.LazyPdfViewer),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-400">
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

type LessonRendererKind = "pdf" | "video" | "audio";

type ResolvedLessonRenderer = {
  assetTypeLabel: string;
  fallbackMessage: string;
  fallbackTitle: string;
  kind: LessonRendererKind | null;
  primaryAssetUrl: string | null;
};

const NOTES_PANEL_OPEN_KEY = "ai-genius-lab:lesson-notes-panel-open";
const DESKTOP_BREAKPOINT = 1024;
const PROGRESS_SYNC_DEBOUNCE_MS = 1200;
const LESSON_COMPLETE_THRESHOLD = 99;
const SAVED_PROGRESS_FEEDBACK_MS = 2500;

type ManualCompletionState = "COMPLETE" | "INCOMPLETE";

function inferLessonRendererFromUrl(url?: string | null): LessonRendererKind | null {
  const normalizedUrl = url?.trim();
  if (!normalizedUrl) return null;
  if (/\.pdf(?:[?#].*)?$/i.test(normalizedUrl)) return "pdf";
  if (/\.(?:mp3|wav|m4a|aac|ogg|flac|opus)(?:[?#].*)?$/i.test(normalizedUrl)) return "audio";
  if (/\.(?:mp4|m4v|mov|webm|m3u8|mpd|avi|mkv)(?:[?#].*)?$/i.test(normalizedUrl)) return "video";
  return null;
}

function normalizeLessonAssetType(lesson: CourseLesson) {
  const runtimeLesson = lesson as CourseLesson & { assetType?: string | null };
  const rawAssetType = runtimeLesson.assetType ?? lesson.type;
  const normalizedAssetType = rawAssetType?.trim().toUpperCase() || "UNKNOWN";
  return normalizedAssetType === "LIVE" ? "VIDEO" : normalizedAssetType;
}

function resolveLessonRenderer(lesson: CourseLesson): ResolvedLessonRenderer {
  const primaryAssetUrl = resolveMediaUrl({
    url: lesson.assetUrl || lesson.videoUrl,
    path: lesson.assetPath,
    fallback: "",
  }) || null;
  const assetTypeLabel = normalizeLessonAssetType(lesson);
  const inferredRenderer = inferLessonRendererFromUrl(primaryAssetUrl);

  const missingAssetRenderer = {
    assetTypeLabel,
    fallbackMessage: `This ${assetTypeLabel.toLowerCase()} lesson is missing its media source.`,
    fallbackTitle: "Lesson asset unavailable",
    kind: null,
    primaryAssetUrl,
  } satisfies ResolvedLessonRenderer;

  if (assetTypeLabel === "PDF" || assetTypeLabel === "VIDEO" || assetTypeLabel === "AUDIO") {
    return primaryAssetUrl ? {
      assetTypeLabel,
      fallbackMessage: "",
      fallbackTitle: "",
      kind: assetTypeLabel.toLowerCase() as LessonRendererKind,
      primaryAssetUrl,
    } : missingAssetRenderer;
  }

  if (primaryAssetUrl && inferredRenderer) {
    return { assetTypeLabel, fallbackMessage: "", fallbackTitle: "", kind: inferredRenderer, primaryAssetUrl };
  }

  return {
    assetTypeLabel,
    fallbackMessage: "Unsupported renderer configuration.",
    fallbackTitle: "Renderer unavailable",
    kind: null,
    primaryAssetUrl,
  };
}

function normalizeLessonProgressEntry(value?: Partial<LessonProgressState> | null): LessonProgressState {
  const isCompleted = Boolean(value?.isCompleted);
  const progressPercent = clampPercentage(isCompleted ? 100 : value?.progressPercent ?? 0);
  return {
    progressPercent,
    watchedSeconds: typeof value?.watchedSeconds === "number" && Number.isFinite(value.watchedSeconds) ? Math.max(0, Math.round(value.watchedSeconds)) : 0,
    lastPdfPage: typeof value?.lastPdfPage === "number" && Number.isFinite(value.lastPdfPage) ? Math.max(1, Math.round(value.lastPdfPage)) : null,
    isCompleted: isCompleted || progressPercent >= 100,
  };
}

function normalizeLessonProgressMap(completedLessonIds: string[], progressMap: LessonProgressMap) {
  const normalized = Object.fromEntries(
    Object.entries(progressMap).map(([lessonId, value]) => [lessonId, normalizeLessonProgressEntry(value)])
  ) as LessonProgressMap;
  completedLessonIds.forEach((lessonId) => {
    normalized[lessonId] = normalizeLessonProgressEntry({ ...normalized[lessonId], progressPercent: 100, isCompleted: true });
  });
  return normalized;
}

function areLessonProgressStatesEqual(left?: LessonProgressState | null, right?: LessonProgressState | null) {
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
  const [isMounted, setIsMounted] = useState(false);
  const modules = course.modules ?? [];
  const allLessons = useMemo(() => modules.flatMap((module) => module.lessons), [modules]);
  const isLessonUnlocked = useCallback((lesson: CourseLesson) => hasFullCourseAccess || lesson.isPreview, [hasFullCourseAccess]);
  const currentLesson = allLessons.find((lesson) => lesson.id === initialLessonId) ?? allLessons[0];
  const currentIndex = allLessons.findIndex((lesson) => lesson.id === currentLesson.id);
  const resolvedLessonRenderer = useMemo(() => resolveLessonRenderer(currentLesson), [currentLesson]);
  const primaryAssetUrl = resolvedLessonRenderer.primaryAssetUrl;
  const isPreviewOnlyLesson = currentLesson.isPreview && !hasFullCourseAccess;
  const previewPagesLimit = isPreviewOnlyLesson && resolvedLessonRenderer.kind === "pdf" ? currentLesson.previewPages ?? undefined : undefined;
  const previewMinutesLimitSeconds = isPreviewOnlyLesson && (resolvedLessonRenderer.kind === "video" || resolvedLessonRenderer.kind === "audio") && currentLesson.previewMinutes ? currentLesson.previewMinutes * 60 : 0;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [lessonProgressMap, setLessonProgressMap] = useState<LessonProgressMap>(() => normalizeLessonProgressMap(initialCompletedLessonIds, initialLessonProgressMap));
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const initialProgress = normalizeLessonProgressEntry(initialLessonProgressMap[initialLessonId]);

  const [noteContent, setNoteContent] = useState(initialNoteContent);
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(initialNoteContent);

  const [previewPdfPage, setPreviewPdfPage] = useState(initialProgress.lastPdfPage ?? 1);
  const [pdfViewportWidth, setPdfViewportWidth] = useState(0);
  const [mediaPlaybackSeconds, setMediaPlaybackSeconds] = useState(initialProgress.watchedSeconds);
  const [timedMediaPreviewLocked, setTimedMediaPreviewLocked] = useState(false);
  const [manualCompletionPending, setManualCompletionPending] = useState(false);
  const [progressSyncState, setProgressSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const currentLessonProgress = normalizeLessonProgressEntry(lessonProgressMap[currentLesson.id]);

  const pdfViewportRef = useRef<HTMLDivElement | null>(null);
  const mediaElementRef = useRef<HTMLVideoElement | null>(null);
  const progressSyncTimeoutRef = useRef<number | null>(null);
  const progressFeedbackTimeoutRef = useRef<number | null>(null);
  const queuedProgressRef = useRef<LessonProgressState | null>(null);
  const lastSyncedProgressRef = useRef<LessonProgressState>(initialProgress);
  const initialMediaSeekAppliedRef = useRef(false);
  const lastReportedMediaSecondRef = useRef(initialProgress.watchedSeconds);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      setNotesPanelOpen(window.localStorage.getItem(NOTES_PANEL_OPEN_KEY) === "true");
      if (window.innerWidth < DESKTOP_BREAKPOINT) setSidebarOpen(false);
    }
  }, []);

  const clearProgressFeedbackTimeout = useCallback(() => {
    if (progressFeedbackTimeoutRef.current) {
      window.clearTimeout(progressFeedbackTimeoutRef.current);
      progressFeedbackTimeoutRef.current = null;
    }
  }, []);

  const markProgressSaved = useCallback(() => {
    clearProgressFeedbackTimeout();
    setProgressSyncState("saved");
    progressFeedbackTimeoutRef.current = window.setTimeout(() => {
      setProgressSyncState((current) => (current === "saved" ? "idle" : current));
      progressFeedbackTimeoutRef.current = null;
    }, SAVED_PROGRESS_FEEDBACK_MS);
  }, [clearProgressFeedbackTimeout]);

  const markProgressSyncError = useCallback(() => {
    clearProgressFeedbackTimeout();
    setProgressSyncState("error");
  }, [clearProgressFeedbackTimeout]);

  useEffect(() => {
    return () => clearProgressFeedbackTimeout();
  }, [clearProgressFeedbackTimeout]);

  // --- Notes Autosave Logic ---
  useEffect(() => {
    if (!isMounted || !viewerId || noteContent === lastSavedContent) return;
    const timer = setTimeout(async () => {
      if (!noteContent.trim() || noteContent === lastSavedContent) return;
      setIsNoteSaving(true);
      try {
        const res = await fetch(`/api/learn/lessons/${currentLesson.id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: noteContent }),
        });
        if (res.ok) setLastSavedContent(noteContent);
      } catch (err) {
        console.error("Failed to autosave note", err);
      } finally {
        setIsNoteSaving(false);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [noteContent, currentLesson.id, viewerId, isMounted, lastSavedContent]);

  const flushPendingLessonProgress = useCallback((lessonId: string) => {
    if (!viewerId || !hasFullCourseAccess) return;
    const pendingProgress = queuedProgressRef.current;
    if (!pendingProgress || areLessonProgressStatesEqual(pendingProgress, lastSyncedProgressRef.current)) return;
    const body = JSON.stringify(pendingProgress);
    queuedProgressRef.current = null;
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon(`/api/learn/lessons/${lessonId}/progress`, new Blob([body], { type: "application/json" }))) {
        lastSyncedProgressRef.current = pendingProgress;
        return;
      }
    }
    fetch(`/api/learn/lessons/${lessonId}/progress`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true })
      .then((res) => { if (res.ok) lastSyncedProgressRef.current = pendingProgress; })
      .catch(() => { queuedProgressRef.current = pendingProgress; });
  }, [hasFullCourseAccess, viewerId]);

  useEffect(() => {
    if (!isMounted) return;
    const handlePageHide = () => flushPendingLessonProgress(currentLesson.id);
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [currentLesson.id, flushPendingLessonProgress, isMounted]);

  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="relative z-40 flex h-20 shrink-0 items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#04070d] via-[#0a0f1a] to-[#04070d] px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-xl p-3 text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-200">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/courses" className="hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-white">
            Back to Courses
          </Link>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
         <div className="max-w-5xl mx-auto">
            {resolvedLessonRenderer.kind === "pdf" && primaryAssetUrl && (
                <div ref={pdfViewportRef} className="min-h-[700px] w-full bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden">
                    <LessonPdfViewerWrapper 
                        file={primaryAssetUrl} 
                        initialPage={previewPdfPage}
                    />
                </div>
            )}
            {/* Additional renderers would go here */}
         </div>
      </main>
    </div>
  );
}