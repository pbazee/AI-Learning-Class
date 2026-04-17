"use client";

import { type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import ReactPlayer from "react-player";
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
import { resolveMediaUrl } from "@/lib/media";
import { DEFAULT_ASK_AI_NAME, clampPercentage } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";

/**
 * PDF Viewer Integration
 * Strictly Dynamic to avoid SSR issues with pdfjs-dist.
 * Using a completely isolated component to prevent any build-time evaluation.
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

function inferLessonRendererFromUrl(url?: string | null): LessonRendererKind | null {
  const normalizedUrl = url?.trim();

  if (!normalizedUrl) {
    return null;
  }

  if (/\.pdf(?:[?#].*)?$/i.test(normalizedUrl)) {
    return "pdf";
  }

  if (/\.(?:mp3|wav|m4a|aac|ogg|flac|opus)(?:[?#].*)?$/i.test(normalizedUrl)) {
    return "audio";
  }

  if (/\.(?:mp4|m4v|mov|webm|m3u8|mpd|avi|mkv)(?:[?#].*)?$/i.test(normalizedUrl)) {
    return "video";
  }

  return null;
}

function normalizeLessonAssetType(lesson: CourseLesson) {
  const runtimeLesson = lesson as CourseLesson & { assetType?: string | null };
  const rawAssetType = runtimeLesson.assetType ?? lesson.type;
  const normalizedAssetType = rawAssetType?.trim().toUpperCase() || "UNKNOWN";

  return normalizedAssetType === "LIVE" ? "VIDEO" : normalizedAssetType;
}

function resolveLessonRenderer(lesson: CourseLesson): ResolvedLessonRenderer {
  const primaryAssetUrl =
    resolveMediaUrl({
      url: lesson.assetUrl || lesson.videoUrl,
      path: lesson.assetPath,
      fallback: "",
    }) || null;
  const assetTypeLabel = normalizeLessonAssetType(lesson);
  const inferredRenderer = inferLessonRendererFromUrl(primaryAssetUrl);

  const missingAssetRenderer = {
    assetTypeLabel,
    fallbackMessage: `This ${assetTypeLabel.toLowerCase()} lesson is missing its media source. Add an asset URL or storage path to make it playable again.`,
    fallbackTitle: "Lesson asset unavailable",
    kind: null,
    primaryAssetUrl,
  } satisfies ResolvedLessonRenderer;

  switch (assetTypeLabel) {
    case "PDF":
      return primaryAssetUrl
        ? {
            assetTypeLabel,
            fallbackMessage: "",
            fallbackTitle: "",
            kind: "pdf",
            primaryAssetUrl,
          }
        : missingAssetRenderer;
    case "VIDEO":
      return primaryAssetUrl
        ? {
            assetTypeLabel,
            fallbackMessage: "",
            fallbackTitle: "",
            kind: "video",
            primaryAssetUrl,
          }
        : missingAssetRenderer;
    case "AUDIO":
      return primaryAssetUrl
        ? {
            assetTypeLabel,
            fallbackMessage: "",
            fallbackTitle: "",
            kind: "audio",
            primaryAssetUrl,
          }
        : missingAssetRenderer;
    default:
      if (primaryAssetUrl && inferredRenderer) {
        return {
          assetTypeLabel,
          fallbackMessage: "",
          fallbackTitle: "",
          kind: inferredRenderer,
          primaryAssetUrl,
        };
      }

      return {
        assetTypeLabel,
        fallbackMessage:
          "This lesson does not have a supported PDF, video, or audio renderer configured yet. Please update the lesson asset type or upload a compatible file.",
        fallbackTitle: "Renderer unavailable",
        kind: null,
        primaryAssetUrl,
      };
  }
}

function LessonAssetFallback({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-slate-700 dark:text-slate-300">
      <div className="rounded-full bg-rose-500/10 p-4">
        <AlertCircle className="h-8 w-8 text-rose-400" />
      </div>
      <div className="max-w-lg space-y-2">
        <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">{message}</p>
      </div>
    </div>
  );
}

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
  const resolvedLessonRenderer = useMemo(
    () => resolveLessonRenderer(currentLesson),
    [currentLesson]
  );
  const primaryAssetUrl = resolvedLessonRenderer.primaryAssetUrl;
  const isPreviewOnlyLesson = currentLesson.isPreview && !hasFullCourseAccess;
  const previewPagesLimit =
    isPreviewOnlyLesson && resolvedLessonRenderer.kind === "pdf"
      ? currentLesson.previewPages ?? undefined
      : undefined;
  const previewMinutesLimitSeconds =
    isPreviewOnlyLesson &&
    (resolvedLessonRenderer.kind === "video" || resolvedLessonRenderer.kind === "audio") &&
    currentLesson.previewMinutes &&
    currentLesson.previewMinutes > 0
      ? currentLesson.previewMinutes * 60
      : 0;

  // --- Preferences & Layout States (Initialized with Defaults) ---
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [lessonProgressMap, setLessonProgressMap] = useState<LessonProgressMap>(() =>
    normalizeLessonProgressMap(initialCompletedLessonIds, initialLessonProgressMap)
  );
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const initialProgress = normalizeLessonProgressEntry(initialLessonProgressMap[initialLessonId]);

  // --- Note States ---
  const [noteContent, setNoteContent] = useState(initialNoteContent);
  const [noteEditMode, setNoteEditMode] = useState<"edit" | "preview">("edit");
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(initialNoteContent);

  // --- PDF & Media States ---
  const [previewPdfPage, setPreviewPdfPage] = useState(initialProgress.lastPdfPage ?? 1);
  const [pdfViewportWidth, setPdfViewportWidth] = useState(0);
  const [mediaPlaybackSeconds, setMediaPlaybackSeconds] = useState(initialProgress.watchedSeconds);
  const [mediaRendererError, setMediaRendererError] = useState<string | null>(null);
  const [timedMediaPreviewLocked, setTimedMediaPreviewLocked] = useState(false);
  const currentLessonProgress = normalizeLessonProgressEntry(lessonProgressMap[currentLesson.id]);

  // --- Refs ---
  const pdfViewportRef = useRef<HTMLDivElement | null>(null);
  const mediaElementRef = useRef<HTMLVideoElement | null>(null);
  const progressSyncTimeoutRef = useRef<number | null>(null);
  const queuedProgressRef = useRef<LessonProgressState | null>(null);
  const lastSyncedProgressRef = useRef<LessonProgressState>(initialProgress);
  const initialMediaSeekAppliedRef = useRef(false);
  const lastReportedMediaSecondRef = useRef(initialProgress.watchedSeconds);

  void initialNotes;
  void initialNoteContent;

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
    setMediaPlaybackSeconds(currentLessonProgress.watchedSeconds);
    setMediaRendererError(null);
    setTimedMediaPreviewLocked(false);
    queuedProgressRef.current = null;
    lastSyncedProgressRef.current = currentLessonProgress;
    mediaElementRef.current = null;
    initialMediaSeekAppliedRef.current = false;
    lastReportedMediaSecondRef.current = currentLessonProgress.watchedSeconds;
  }, [currentLesson.id]);

  useEffect(() => {
    if (!isMounted || resolvedLessonRenderer.kind !== "pdf" || !pdfViewportRef.current) {
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
  }, [currentLesson.id, isMounted, resolvedLessonRenderer.kind]);

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

  const updateCurrentLessonProgress = useCallback(
    (updates: Partial<LessonProgressState>) => {
      if (!hasFullCourseAccess || !viewerId) {
        return;
      }

      const normalized = normalizeLessonProgressEntry({
        ...lessonProgressMap[currentLesson.id],
        ...updates,
      });

      setLessonProgressMap((current) => ({ ...current, [currentLesson.id]: normalized }));
      queueLessonProgressSync(normalized);
    },
    [currentLesson.id, hasFullCourseAccess, lessonProgressMap, queueLessonProgressSync, viewerId]
  );

  const handlePdfProgressUpdate = useCallback((percent: number, page: number) => {
    setPreviewPdfPage(page);
    updateCurrentLessonProgress({
      progressPercent: percent >= LESSON_COMPLETE_THRESHOLD ? 100 : percent,
      lastPdfPage: page,
      isCompleted: percent >= LESSON_COMPLETE_THRESHOLD,
    });
  }, [updateCurrentLessonProgress]);

  const clampMediaPreview = useCallback(
    (nextTime: number) => {
      if (!previewMinutesLimitSeconds || hasFullCourseAccess) {
        setMediaPlaybackSeconds(nextTime);
        return nextTime;
      }

      const clampedTime = Math.min(nextTime, previewMinutesLimitSeconds);
      setMediaPlaybackSeconds(clampedTime);

      if (nextTime >= previewMinutesLimitSeconds && mediaElementRef.current) {
        mediaElementRef.current.currentTime = previewMinutesLimitSeconds;
        mediaElementRef.current.pause();
        setTimedMediaPreviewLocked(true);
      }

      return clampedTime;
    },
    [hasFullCourseAccess, previewMinutesLimitSeconds]
  );

  const syncMediaResumePosition = useCallback(() => {
    const mediaElement = mediaElementRef.current;

    if (!mediaElement || initialMediaSeekAppliedRef.current) {
      return;
    }

    const storedWatchedSeconds = currentLessonProgress.watchedSeconds;

    if (storedWatchedSeconds <= 0) {
      initialMediaSeekAppliedRef.current = true;
      return;
    }

    const candidateCaps = [
      Number.isFinite(mediaElement.duration) && mediaElement.duration > 0 ? mediaElement.duration : null,
      previewMinutesLimitSeconds > 0 ? previewMinutesLimitSeconds : null,
    ].filter((value): value is number => typeof value === "number" && value > 0);

    const resumeAtSeconds =
      candidateCaps.length > 0
        ? Math.min(storedWatchedSeconds, ...candidateCaps)
        : storedWatchedSeconds;

    mediaElement.currentTime = resumeAtSeconds;
    setMediaPlaybackSeconds(resumeAtSeconds);
    initialMediaSeekAppliedRef.current = true;
  }, [currentLessonProgress.watchedSeconds, previewMinutesLimitSeconds]);

  const handleMediaProgressUpdate = useCallback(
    (watchedSeconds: number, durationSeconds: number, forceComplete = false) => {
      const nextWatchedSeconds = Math.max(
        lessonProgressMap[currentLesson.id]?.watchedSeconds ?? 0,
        Math.max(0, Math.round(watchedSeconds))
      );
      const safeDurationSeconds =
        Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0;
      const rawProgressPercent = forceComplete
        ? 100
        : safeDurationSeconds > 0
          ? (nextWatchedSeconds / safeDurationSeconds) * 100
          : lessonProgressMap[currentLesson.id]?.progressPercent ?? 0;
      const progressPercent = rawProgressPercent >= LESSON_COMPLETE_THRESHOLD ? 100 : rawProgressPercent;

      updateCurrentLessonProgress({
        watchedSeconds: nextWatchedSeconds,
        progressPercent,
        isCompleted: forceComplete || rawProgressPercent >= LESSON_COMPLETE_THRESHOLD,
      });
    },
    [currentLesson.id, lessonProgressMap, updateCurrentLessonProgress]
  );

  const handleMediaTimeUpdate = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      mediaElementRef.current = event.currentTarget;

      if (!initialMediaSeekAppliedRef.current) {
        syncMediaResumePosition();
        return;
      }

      const durationSeconds =
        Number.isFinite(event.currentTarget.duration) && event.currentTarget.duration > 0
          ? event.currentTarget.duration
          : 0;
      const clampedTime = clampMediaPreview(event.currentTarget.currentTime);
      const roundedSeconds = Math.max(0, Math.floor(clampedTime));

      if (roundedSeconds === lastReportedMediaSecondRef.current) {
        return;
      }

      lastReportedMediaSecondRef.current = roundedSeconds;
      handleMediaProgressUpdate(roundedSeconds, durationSeconds);
    },
    [clampMediaPreview, handleMediaProgressUpdate, syncMediaResumePosition]
  );

  const handleMediaSeeking = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      mediaElementRef.current = event.currentTarget;

      if (!previewMinutesLimitSeconds || hasFullCourseAccess) {
        return;
      }

      if (event.currentTarget.currentTime > previewMinutesLimitSeconds) {
        event.currentTarget.currentTime = Math.min(
          mediaPlaybackSeconds,
          previewMinutesLimitSeconds
        );
      }
    },
    [hasFullCourseAccess, mediaPlaybackSeconds, previewMinutesLimitSeconds]
  );

  const handleMediaEnded = useCallback(() => {
    const fallbackDurationSeconds = mediaElementRef.current?.duration ?? mediaPlaybackSeconds;
    const completedSeconds =
      Number.isFinite(fallbackDurationSeconds) && fallbackDurationSeconds > 0
        ? Math.round(fallbackDurationSeconds)
        : Math.round(mediaPlaybackSeconds);
    const hasReachedPreviewLimit =
      previewMinutesLimitSeconds > 0 && completedSeconds >= previewMinutesLimitSeconds;

    if (!hasFullCourseAccess && hasReachedPreviewLimit) {
      setTimedMediaPreviewLocked(true);
      return;
    }

    lastReportedMediaSecondRef.current = completedSeconds;
    setMediaPlaybackSeconds(completedSeconds);
    handleMediaProgressUpdate(completedSeconds, completedSeconds || 1, true);
  }, [
    handleMediaProgressUpdate,
    hasFullCourseAccess,
    mediaPlaybackSeconds,
    previewMinutesLimitSeconds,
  ]);

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

    const handlePageHide = () => {
      flushPendingLessonProgress(currentLesson.id);
    };
    window.addEventListener("pagehide", handlePageHide);

    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [currentLesson.id, flushPendingLessonProgress, isMounted]);

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
        if (res.ok) {
          setLastSavedContent(noteContent);
        }
      } catch (err) {
        console.error("Failed to autosave note", err);
      } finally {
        setIsNoteSaving(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [noteContent, currentLesson.id, viewerId, isMounted, lastSavedContent]);

  // --- Render Guard (The Hydration Fix) ---
  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
      </div>
    );
  }

  const hasPdfPreviewLimit = Boolean(previewPagesLimit && previewPagesLimit > 0);
  const pdfPreviewMaxed = Boolean(hasPdfPreviewLimit && previewPagesLimit && previewPdfPage >= previewPagesLimit);
  const mediaPreviewMaxed = Boolean(
    !hasFullCourseAccess &&
      previewMinutesLimitSeconds > 0 &&
      (timedMediaPreviewLocked || mediaPlaybackSeconds >= previewMinutesLimitSeconds)
  );
  const assetShellClassName = cn(
    "relative mb-12 overflow-hidden rounded-3xl border border-white/5 bg-black/40 shadow-2xl",
    resolvedLessonRenderer.kind === "audio"
      ? "min-h-[320px]"
      : "aspect-video min-h-[360px] sm:min-h-[500px]"
  );

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <header className="z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
          <Link href={`/courses/${course.slug}`} className="group flex items-center gap-2">
            <h1 className="max-w-[120px] truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-primary-blue dark:text-white sm:max-w-xs">
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
          <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setNotesPanelOpen(!notesPanelOpen)}
              className={cn(
                "rounded-lg p-2 transition-colors",
                notesPanelOpen ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              )}
            >
              <NotebookText className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="relative hidden h-full shrink-0 flex-col border-r border-slate-200 bg-white/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/50 lg:flex"
            >
              <div className="flex h-full flex-col overflow-hidden">
                {/* Course Progress Card */}
                <div className="p-6">
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-primary-blue/20 to-transparent p-5">
                    <div className="relative z-10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary-blue/80">Course Completion</p>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">
                          {Math.round(
                            (Object.values(lessonProgressMap).filter(p => p.isCompleted).length /
                            (allLessons.length || 1)) * 100
                          )}%
                        </span>
                        <span className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">of all lessons</span>
                      </div>
                      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <motion.div 
                          className="h-full bg-primary-blue shadow-[0_0_12px_rgba(0,86,210,0.5)]"
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${(Object.values(lessonProgressMap).filter(p => p.isCompleted).length / (allLessons.length || 1)) * 100}%` 
                          }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                    {/* Decorative Background */}
                    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary-blue/10 blur-2xl" />
                  </div>
                </div>

                {/* Lesson List */}
                <div className="flex-1 overflow-y-auto px-4 pb-8 custom-scrollbar">
                  <div className="space-y-6">
                    {modules.map((module, mIdx) => (
                      <div key={module.id} className="space-y-2">
                        <h3 className="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {mIdx + 1}. {module.title}
                        </h3>
                        <div className="grid gap-1">
                          {module.lessons.map((lesson) => {
                            const isSelected = lesson.id === currentLesson.id;
                            const isLocked = !isLessonUnlocked(lesson);
                            const progress = lessonProgressMap[lesson.id];
                            const isCompleted = progress?.isCompleted;
                            
                            return (
                              <Link
                                key={lesson.id}
                                href={isLocked ? "#" : `/learn/${course.slug}/${lesson.id}`}
                                className={cn(
                                  "group relative flex items-center justify-between rounded-xl p-3 transition-all duration-200",
                                  isSelected ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
                                  isLocked && "cursor-not-allowed opacity-50"
                                )}
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                                    {isLocked ? (
                                      <Lock className="h-4 w-4 text-slate-600" />
                                    ) : isCompleted ? (
                                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      </div>
                                    ) : (
                                      <div className="relative h-5 w-5 rounded-full border-2 border-slate-700">
                                        {progress && progress.progressPercent > 0 && (
                                          <svg className="absolute -left-0.5 -top-0.5 h-6 w-6 -rotate-90">
                                            <circle
                                              cx="12"
                                              cy="12"
                                              r="10"
                                              fill="transparent"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeDasharray={2 * Math.PI * 10}
                                              strokeDashoffset={2 * Math.PI * 10 * (1 - progress.progressPercent / 100)}
                                              className="text-primary-blue transition-all duration-500"
                                            />
                                          </svg>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <span className="truncate text-xs font-bold leading-tight">
                                    {lesson.title}
                                  </span>
                                </div>
                                {isSelected && (
                                  <motion.div 
                                    layoutId="active-indicator"
                                    className="absolute left-0 h-4 w-1 rounded-r-full bg-primary-blue" 
                                  />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
              {/* Asset Viewer */}
              <div ref={pdfViewportRef} className={assetShellClassName}>
                {resolvedLessonRenderer.kind === "pdf" && primaryAssetUrl ? (
                  <LessonPdfViewerWrapper
                    key={currentLesson.id}
                    file={primaryAssetUrl}
                    lessonId={currentLesson.id}
                    viewportWidth={pdfViewportWidth || 800}
                    initialPage={currentLessonProgress.lastPdfPage || 1}
                    onProgress={handlePdfProgressUpdate}
                    maxPages={hasPdfPreviewLimit ? previewPagesLimit : undefined}
                  />
                ) : resolvedLessonRenderer.kind === "video" && primaryAssetUrl ? (
                  <div className="relative h-full w-full bg-black dark:bg-black">
                    <ReactPlayer
                      key={currentLesson.id}
                      ref={mediaElementRef}
                      src={primaryAssetUrl}
                      controls
                      width="100%"
                      height="100%"
                      playsInline
                      onReady={syncMediaResumePosition}
                      onLoadedMetadata={(event) => {
                        mediaElementRef.current = event.currentTarget;
                        syncMediaResumePosition();
                      }}
                      onTimeUpdate={handleMediaTimeUpdate}
                      onSeeking={handleMediaSeeking}
                      onEnded={handleMediaEnded}
                      onError={() =>
                        setMediaRendererError(
                          "We couldn't start this video lesson. Please verify the uploaded asset URL or storage file and try again."
                        )
                      }
                      style={{ backgroundColor: "#000" }}
                    />

                    <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/82 backdrop-blur-md dark:bg-black/55">
                      <PlayCircle className="h-3.5 w-3.5 text-primary-blue" />
                      Video Lesson
                    </div>
                  </div>
                ) : resolvedLessonRenderer.kind === "audio" && primaryAssetUrl ? (
                  <div className="flex h-full flex-col justify-center bg-gradient-to-b from-slate-50 to-white px-5 py-8 dark:from-slate-900 dark:to-slate-950 sm:px-10">
                    <div className="mb-8 max-w-2xl">
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Volume2 className="h-3.5 w-3.5 text-primary-blue" />
                        Audio Lesson
                      </div>
                       <h3 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{currentLesson.title}</h3>
                       <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Listen to this lesson directly in the player and keep your learning progress in sync.
                      </p>
                    </div>

                    <div className="rounded-[28px] border border-slate-300 bg-white/50 p-4 shadow-[0_28px_80px_-48px_rgba(0,0,0,0.1)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/50 sm:p-6">
                      <ReactPlayer
                        key={currentLesson.id}
                        ref={mediaElementRef}
                        src={primaryAssetUrl}
                        controls
                        width="100%"
                        height="56px"
                        playsInline
                        onReady={syncMediaResumePosition}
                        onLoadedMetadata={(event) => {
                          mediaElementRef.current = event.currentTarget;
                          syncMediaResumePosition();
                        }}
                        onTimeUpdate={handleMediaTimeUpdate}
                        onSeeking={handleMediaSeeking}
                        onEnded={handleMediaEnded}
                        onError={() =>
                          setMediaRendererError(
                            "We couldn't start this audio lesson. Please verify the uploaded asset URL or storage file and try again."
                          )
                        }
                        style={{ backgroundColor: "transparent" }}
                      />
                    </div>
                  </div>
                ) : (
                  <LessonAssetFallback
                    title={resolvedLessonRenderer.fallbackTitle}
                    message={resolvedLessonRenderer.fallbackMessage}
                  />
                )}

                {mediaRendererError ? (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/82 px-6 backdrop-blur-sm dark:bg-black/82">
                    <LessonAssetFallback title="Playback failed" message={mediaRendererError} />
                  </div>
                ) : null}

                {pdfPreviewMaxed && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 p-8 text-center backdrop-blur-sm dark:bg-black/80">
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

                {mediaPreviewMaxed && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/82 p-8 text-center backdrop-blur-sm dark:bg-black/82">
                    <Lock className="mb-4 h-12 w-12 text-primary-blue" />
                    <h3 className="mb-2 text-xl font-bold">Preview Limit Reached</h3>
                    <p className="mb-6 max-w-md text-sm text-slate-400">
                      You've reached the first {currentLesson.previewMinutes} minute
                      {currentLesson.previewMinutes === 1 ? "" : "s"} of this lesson preview.
                      Unlock the full course to keep listening or watching.
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
                <h2 className="mb-6 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
                  {currentLesson.title}
                </h2>
                <div className="flex flex-wrap gap-4 border-y border-slate-200 dark:border-slate-700 py-6">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Clock3 className="h-4 w-4" />
                    <span className="text-xs font-medium">{currentLesson.duration || "5m read"}</span>
                  </div>
                   <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                     <FileText className="h-4 w-4" />
                     <span className="text-xs font-medium">{resolvedLessonRenderer.assetTypeLabel} Content</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation Bar */}
          <div className="border-t border-slate-200 bg-white/60 p-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/60">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
              {prevLesson ? (
                <Link href={`/learn/${course.slug}/${prevLesson.id}`} className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Link>
              ) : <div />}
              
              {nextLesson ? (
                <Link href={`/learn/${course.slug}/${nextLesson.id}`} className="flex items-center gap-2 rounded-xl bg-primary-blue px-5 py-2 text-sm font-bold text-white hover:bg-primary-blue/90">
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

        {/* Floating Notes Panel */}
        <AnimatePresence>
          {notesPanelOpen && (
            <motion.aside
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-6 right-6 top-24 z-30 w-[calc(100%-3rem)] overflow-hidden rounded-[32px] border border-slate-300 bg-white/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] backdrop-blur-3xl dark:border-slate-700 dark:bg-slate-950/60 dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] sm:w-96"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <NotebookText className="h-4 w-4 text-primary-blue" />
                     <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">Lesson Notes</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {isNoteSaving && (
                      <div className="mr-2 flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving...
                      </div>
                    )}
                    <button
                      onClick={() => setNotesPanelOpen(false)}
                      className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Editor Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 px-4 pt-1">
                  <button
                    onClick={() => setNoteEditMode("edit")}
                    className={cn(
                      "px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors",
                      noteEditMode === "edit" ? "border-b-2 border-primary-blue text-slate-900 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-300"
                    )}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setNoteEditMode("preview")}
                    className={cn(
                      "px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors",
                      noteEditMode === "preview" ? "border-b-2 border-primary-blue text-slate-900 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-300"
                    )}
                  >
                    Preview
                  </button>
                </div>

                {/* Editor Content */}
                <div className="flex-1 overflow-hidden p-6">
                  {noteEditMode === "edit" ? (
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Take a note for this lesson. Use Markdown for formatting..."
                      className="h-full w-full resize-none border-none bg-transparent text-sm leading-relaxed text-slate-300 outline-none placeholder:text-slate-700 custom-scrollbar"
                    />
                  ) : (
                    <div className="h-full w-full overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-300 custom-scrollbar">
                      {noteContent || <span className="italic text-slate-600">Nothing to preview yet. Start typing!</span>}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-3 dark:border-slate-700 dark:bg-slate-900/50">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <Sparkles className="h-3 w-3 text-primary-blue" />
                    Lesson Specific
                  </div>
                  <span className="text-[10px] font-medium text-slate-600">
                    {noteContent.length} characters
                  </span>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
