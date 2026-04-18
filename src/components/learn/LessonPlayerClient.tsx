"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Lock,
  Menu,
  NotebookText,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";

import { AskAI } from "@/components/courses/AskAI";
import {
  MediaPlayer,
  type MediaPlayerHandle,
  type MediaPlayerSnapshot,
} from "./MediaPlayer";
import { cn } from "@/lib/utils";
import { clampPercentage, DEFAULT_ASK_AI_NAME } from "@/lib/site";
import type { Course } from "@/types";
import { resolveMediaUrl } from "@/lib/media";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LessonNotesPanel } from "./LessonNotesPanel";

const LessonPdfViewer = dynamic(() => import("./LessonPdfViewer").then((mod) => mod.LessonPdfViewer), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/5 min-h-[600px]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm text-white/60">Loading document...</p>
      </div>
    </div>
  ),
});

type LessonPlayerNote = {
  id: string;
  content: string;
  timestamp: string;
};

type CourseLesson = NonNullable<Course["modules"]>[number]["lessons"][number];
type LessonRendererKind = "pdf" | "video" | "audio";

type LessonProgressState = {
  contentType: LessonRendererKind | null;
  progressPercent: number;
  lastPosition: number | null;
  lastPage: number | null;
  watchedSeconds: number;
  lastPdfPage: number | null;
  isCompleted: boolean;
  completedAt?: string | null;
  updatedAt?: string | null;
};

type LessonProgressMap = Record<string, LessonProgressState>;

type ResolvedLessonRenderer = {
  assetTypeLabel: string;
  fallbackMessage: string;
  fallbackTitle: string;
  kind: LessonRendererKind | null;
  primaryAssetUrl: string | null;
};

type ResumePromptState =
  | { kind: "media"; position: number }
  | { kind: "pdf"; page: number }
  | null;

type PdfScrollRequest = {
  page: number;
  nonce: number;
  behavior?: ScrollBehavior;
} | null;

const DESKTOP_BREAKPOINT = 1024;
const MEDIA_SAVE_INTERVAL_SECONDS = 5;
const PDF_SAVE_DEBOUNCE_MS = 500;
const SAVED_PROGRESS_FEEDBACK_MS = 2500;

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
    fallbackMessage: `This ${assetTypeLabel.toLowerCase()} lesson is missing its media source.`,
    fallbackTitle: "Lesson asset unavailable",
    kind: null,
    primaryAssetUrl,
  } satisfies ResolvedLessonRenderer;

  if (assetTypeLabel === "PDF" || assetTypeLabel === "VIDEO" || assetTypeLabel === "AUDIO") {
    return primaryAssetUrl
      ? {
          assetTypeLabel,
          fallbackMessage: "",
          fallbackTitle: "",
          kind: assetTypeLabel.toLowerCase() as LessonRendererKind,
          primaryAssetUrl,
        }
      : missingAssetRenderer;
  }

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
    fallbackMessage: "Unsupported renderer configuration.",
    fallbackTitle: "Renderer unavailable",
    kind: null,
    primaryAssetUrl,
  };
}

function normalizeLessonProgressEntry(
  value?: Partial<LessonProgressState> | null
): LessonProgressState {
  const lastPosition =
    typeof value?.lastPosition === "number" && Number.isFinite(value.lastPosition)
      ? Math.max(0, Math.round(value.lastPosition))
      : typeof value?.watchedSeconds === "number" && Number.isFinite(value.watchedSeconds)
        ? Math.max(0, Math.round(value.watchedSeconds))
        : null;
  const lastPage =
    typeof value?.lastPage === "number" && Number.isFinite(value.lastPage)
      ? Math.max(1, Math.round(value.lastPage))
      : typeof value?.lastPdfPage === "number" && Number.isFinite(value.lastPdfPage)
        ? Math.max(1, Math.round(value.lastPdfPage))
        : null;
  const isCompleted = Boolean(value?.isCompleted);
  const progressPercent = clampPercentage(isCompleted ? 100 : value?.progressPercent ?? 0);

  return {
    contentType: value?.contentType ?? null,
    progressPercent,
    lastPosition,
    lastPage,
    watchedSeconds: lastPosition ?? 0,
    lastPdfPage: lastPage,
    isCompleted: isCompleted || progressPercent >= 100,
    completedAt: value?.completedAt ?? null,
    updatedAt: value?.updatedAt ?? null,
  };
}

function normalizeLessonProgressMap(
  completedLessonIds: string[],
  progressMap: Record<string, Partial<LessonProgressState>>
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
    left?.contentType === right?.contentType &&
    left?.progressPercent === right?.progressPercent &&
    left?.lastPosition === right?.lastPosition &&
    left?.lastPage === right?.lastPage &&
    left?.isCompleted === right?.isCompleted &&
    left?.completedAt === right?.completedAt
  );
}

function calculateCourseProgress(allLessons: CourseLesson[], lessonProgressMap: LessonProgressMap) {
  if (allLessons.length === 0) {
    return {
      completedLessons: 0,
      overallProgress: 0,
    };
  }

  const progressEntries = allLessons.map((lesson) =>
    normalizeLessonProgressEntry(lessonProgressMap[lesson.id])
  );
  const completedLessons = progressEntries.filter((entry) => entry.isCompleted).length;
  const overallProgress = Math.round(
    progressEntries.reduce((sum, entry) => sum + entry.progressPercent, 0) / allLessons.length
  );

  return {
    completedLessons,
    overallProgress,
  };
}

function getLessonSidebarIcon(lesson: CourseLesson) {
  switch (normalizeLessonAssetType(lesson)) {
    case "VIDEO":
      return PlayCircle;
    case "AUDIO":
      return Volume2;
    default:
      return FileText;
  }
}

function formatTimeLabel(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ResumeOverlay({
  prompt,
  onResume,
  onStartOver,
}: {
  prompt: ResumePromptState;
  onResume: () => void;
  onStartOver: () => void;
}) {
  if (!prompt) {
    return null;
  }

  const description =
    prompt.kind === "media"
      ? `Continue watching from ${formatTimeLabel(prompt.position)}?`
      : `Continue reading from page ${prompt.page}?`;
  const secondaryLabel =
    prompt.kind === "media" ? "Start Over" : "Start from Beginning";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-auto absolute bottom-6 left-1/2 z-30 w-[min(calc(100%-2rem),34rem)] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#08101d]/92 p-4 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-blue">
            Resume lesson
          </p>
          <p className="mt-1 text-sm font-medium text-white">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResume}
            className="inline-flex items-center justify-center rounded-xl bg-primary-blue px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-blue/25 transition hover:bg-primary-blue/90"
          >
            Resume
          </button>
          <button
            onClick={onStartOver}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {secondaryLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function LessonPlayerClient({
  course,
  initialLessonId,
  viewerId,
  initialCompletedLessonIds,
  initialLessonProgressMap,
  initialNotes: _initialNotes,
  initialNoteContent,
  hasFullCourseAccess,
  askAiEnabled,
  askAiAssistantLabel = DEFAULT_ASK_AI_NAME,
}: {
  course: Course;
  initialLessonId: string;
  viewerId: string | null;
  initialCompletedLessonIds: string[];
  initialLessonProgressMap: Record<string, Partial<LessonProgressState>>;
  initialNotes: LessonPlayerNote[];
  initialNoteContent: string;
  hasFullCourseAccess: boolean;
  askAiEnabled: boolean;
  askAiAssistantLabel?: string;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [lessonProgressMap, setLessonProgressMap] = useState<LessonProgressMap>(() =>
    normalizeLessonProgressMap(initialCompletedLessonIds, initialLessonProgressMap)
  );
  const [noteContent, setNoteContent] = useState(initialNoteContent);
  const [lastSavedContent, setLastSavedContent] = useState(initialNoteContent);
  const [, setIsNoteSaving] = useState(false);
  const [manualCompletionPending, setManualCompletionPending] = useState(false);
  const [progressSyncState, setProgressSyncState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [pdfViewportWidth, setPdfViewportWidth] = useState(0);
  const [mediaStartTime, setMediaStartTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [pdfInitialPage, setPdfInitialPage] = useState(1);
  const [pdfScrollRequest, setPdfScrollRequest] = useState<PdfScrollRequest>(null);
  const [resumePrompt, setResumePrompt] = useState<ResumePromptState>(null);

  const modules = course.modules ?? [];
  const allLessons = useMemo(() => modules.flatMap((module) => module.lessons), [modules]);
  const currentLesson =
    allLessons.find((lesson) => lesson.id === initialLessonId) ?? allLessons[0];
  const currentIndex = allLessons.findIndex((lesson) => lesson.id === currentLesson.id);
  const resolvedLessonRenderer = useMemo(
    () => resolveLessonRenderer(currentLesson),
    [currentLesson]
  );
  const currentLessonProgress = normalizeLessonProgressEntry(lessonProgressMap[currentLesson.id]);
  const currentContentType = resolvedLessonRenderer.kind;
  const primaryAssetUrl = resolvedLessonRenderer.primaryAssetUrl;
  const isPreviewOnlyLesson = currentLesson.isPreview && !hasFullCourseAccess;
  const previewPagesLimit =
    isPreviewOnlyLesson && currentContentType === "pdf"
      ? currentLesson.previewPages ?? undefined
      : undefined;
  const previewMinutesLimitSeconds =
    isPreviewOnlyLesson &&
    (currentContentType === "video" || currentContentType === "audio") &&
    currentLesson.previewMinutes
      ? currentLesson.previewMinutes * 60
      : 0;
  const canPersistProgress = Boolean(viewerId && hasFullCourseAccess && currentContentType);
  const { completedLessons, overallProgress } = useMemo(
    () => calculateCourseProgress(allLessons, lessonProgressMap),
    [allLessons, lessonProgressMap]
  );

  const pdfViewportRef = useRef<HTMLDivElement | null>(null);
  const mediaPlayerRef = useRef<MediaPlayerHandle | null>(null);
  const progressFeedbackTimeoutRef = useRef<number | null>(null);
  const pdfSaveTimeoutRef = useRef<number | null>(null);
  const progressSaveQueueRef = useRef(Promise.resolve());
  const lastPersistedPayloadRef = useRef("");
  const lastMediaSavedCheckpointRef = useRef(currentLessonProgress.lastPosition ?? 0);
  const latestMediaSnapshotRef = useRef<MediaPlayerSnapshot | null>(null);
  const latestPdfSnapshotRef = useRef({
    page: currentLessonProgress.lastPage ?? 1,
    totalPages: 0,
  });
  const pdfScrollNonceRef = useRef(0);

  const isLessonUnlocked = useCallback(
    (lesson: CourseLesson) => hasFullCourseAccess || lesson.isPreview,
    [hasFullCourseAccess]
  );

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

  const clearPdfSaveTimeout = useCallback(() => {
    if (pdfSaveTimeoutRef.current) {
      window.clearTimeout(pdfSaveTimeoutRef.current);
      pdfSaveTimeoutRef.current = null;
    }
  }, []);

  const updateCurrentLessonProgress = useCallback(
    (
      updater:
        | Partial<LessonProgressState>
        | ((current: LessonProgressState) => Partial<LessonProgressState> | LessonProgressState)
    ) => {
      setLessonProgressMap((prev) => {
        const current = normalizeLessonProgressEntry(prev[currentLesson.id]);
        const nextRaw =
          typeof updater === "function"
            ? updater(current)
            : {
                ...current,
                ...updater,
              };
        const next = normalizeLessonProgressEntry(
          typeof updater === "function" ? nextRaw : { ...current, ...nextRaw }
        );

        if (areLessonProgressStatesEqual(current, next)) {
          return prev;
        }

        return {
          ...prev,
          [currentLesson.id]: next,
        };
      });
    },
    [currentLesson.id]
  );

  const applyServerCourseProgress = useCallback(
    (courseProgress?: {
      completedLessonIds?: string[];
      lessonProgressByLessonId?: Record<string, Partial<LessonProgressState>>;
    }) => {
      if (!courseProgress?.lessonProgressByLessonId) {
        return;
      }

      setLessonProgressMap(
        normalizeLessonProgressMap(
          courseProgress.completedLessonIds ?? [],
          courseProgress.lessonProgressByLessonId
        )
      );
    },
    []
  );

  const persistProgress = useCallback(
    (
      payload: {
        progressPercent?: number;
        lastPosition?: number | null;
        lastPage?: number | null;
        isCompleted?: boolean;
      },
      options?: { force?: boolean; keepalive?: boolean }
    ) => {
      if (!canPersistProgress || !currentContentType) {
        return;
      }

      const body = {
        lessonId: currentLesson.id,
        contentType: currentContentType,
        ...payload,
      };
      const signature = JSON.stringify(body);

      if (!options?.force && signature === lastPersistedPayloadRef.current) {
        return;
      }

      const runSave = async () => {
        if (!options?.keepalive) {
          setProgressSyncState("saving");
        }

        const response = await fetch("/api/progress", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          keepalive: options?.keepalive,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to save lesson progress (${response.status}).`);
        }

        lastPersistedPayloadRef.current = signature;

        if (options?.keepalive) {
          return;
        }

        const data = (await response.json().catch(() => null)) as
          | {
              progress?: Partial<LessonProgressState>;
              courseProgress?: {
                completedLessonIds?: string[];
                lessonProgressByLessonId?: Record<string, Partial<LessonProgressState>>;
              };
            }
          | null;

        if (data?.progress) {
          updateCurrentLessonProgress(data.progress);
        }

        if (data?.courseProgress) {
          applyServerCourseProgress(data.courseProgress);
        }

        markProgressSaved();
      };

      if (options?.keepalive) {
        lastPersistedPayloadRef.current = signature;
        void runSave().catch(() => undefined);
        return;
      }

      progressSaveQueueRef.current = progressSaveQueueRef.current.then(runSave, runSave).catch((error) => {
        console.error("[lesson-player] Failed to save lesson progress.", error);
        markProgressSyncError();
      });
    },
    [
      applyServerCourseProgress,
      canPersistProgress,
      currentContentType,
      currentLesson.id,
      markProgressSaved,
      markProgressSyncError,
      updateCurrentLessonProgress,
    ]
  );

  const flushProgressBeforeUnload = useCallback(() => {
    if (!canPersistProgress || !currentContentType) {
      return;
    }

    clearPdfSaveTimeout();

    if (currentContentType === "pdf") {
      const currentPage = latestPdfSnapshotRef.current.page;
      const totalPages = latestPdfSnapshotRef.current.totalPages;
      const isCompleted = totalPages > 0 && currentPage >= totalPages;
      const percent =
        totalPages > 0 ? (isCompleted ? 100 : Math.round((currentPage / totalPages) * 100)) : 0;

      persistProgress(
        {
          progressPercent: percent,
          lastPage: currentPage,
          isCompleted,
        },
        { force: true, keepalive: true }
      );
      return;
    }

    const snapshot = latestMediaSnapshotRef.current;
    const effectiveDuration =
      snapshot?.duration || mediaDuration || previewMinutesLimitSeconds || 0;
    const currentTime = Math.max(
      0,
      Math.round(snapshot?.currentTime ?? currentLessonProgress.lastPosition ?? 0)
    );
    const isCompleted = effectiveDuration > 0 && currentTime >= Math.max(Math.round(effectiveDuration) - 1, 0);
    const percent =
      effectiveDuration > 0 ? (isCompleted ? 100 : Math.round((currentTime / effectiveDuration) * 100)) : 0;

    persistProgress(
      {
        progressPercent: percent,
        lastPosition: isCompleted ? null : currentTime,
        isCompleted,
      },
      { force: true, keepalive: true }
    );
  }, [
    canPersistProgress,
    clearPdfSaveTimeout,
    currentContentType,
    currentLessonProgress.lastPosition,
    mediaDuration,
    persistProgress,
    previewMinutesLimitSeconds,
  ]);

  const completeCurrentMediaLesson = useCallback(
    (durationSeconds: number) => {
      updateCurrentLessonProgress((current) => ({
        ...current,
        contentType: currentContentType,
        progressPercent: 100,
        lastPosition: null,
        watchedSeconds: 0,
        isCompleted: true,
        completedAt: new Date().toISOString(),
      }));
      setResumePrompt(null);
      lastMediaSavedCheckpointRef.current = 0;

      if (canPersistProgress) {
        persistProgress(
          {
            progressPercent: 100,
            lastPosition: null,
            isCompleted: true,
          },
          { force: true }
        );
      }

      latestMediaSnapshotRef.current = {
        currentTime: durationSeconds,
        duration: durationSeconds,
        progressPercent: 100,
      };
    },
    [canPersistProgress, currentContentType, persistProgress, updateCurrentLessonProgress]
  );

  const handleMediaProgress = useCallback(
    (snapshot: MediaPlayerSnapshot) => {
      const effectiveDuration =
        previewMinutesLimitSeconds > 0
          ? Math.min(snapshot.duration || previewMinutesLimitSeconds, previewMinutesLimitSeconds)
          : snapshot.duration;
      const currentTime = Math.max(
        0,
        Math.round(
          effectiveDuration > 0
            ? Math.min(snapshot.currentTime, effectiveDuration)
            : snapshot.currentTime
        )
      );
      const isCompleted =
        effectiveDuration > 0 && currentTime >= Math.max(Math.round(effectiveDuration) - 1, 0);
      const percent =
        effectiveDuration > 0 ? (isCompleted ? 100 : Math.round((currentTime / effectiveDuration) * 100)) : 0;

      latestMediaSnapshotRef.current = {
        currentTime,
        duration: effectiveDuration,
        progressPercent: percent,
      };
      setMediaDuration(effectiveDuration);

      updateCurrentLessonProgress((current) => ({
        ...current,
        contentType: currentContentType,
        progressPercent: percent,
        lastPosition: isCompleted ? null : currentTime,
        watchedSeconds: isCompleted ? 0 : currentTime,
        isCompleted: isCompleted || current.isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : current.completedAt ?? null,
      }));

      if (isCompleted) {
        completeCurrentMediaLesson(effectiveDuration);
        return;
      }

      if (
        canPersistProgress &&
        Math.abs(currentTime - lastMediaSavedCheckpointRef.current) >= MEDIA_SAVE_INTERVAL_SECONDS
      ) {
        lastMediaSavedCheckpointRef.current = currentTime;
        persistProgress({
          progressPercent: percent,
          lastPosition: currentTime,
          isCompleted: false,
        });
      }
    },
    [
      canPersistProgress,
      completeCurrentMediaLesson,
      currentContentType,
      persistProgress,
      previewMinutesLimitSeconds,
      updateCurrentLessonProgress,
    ]
  );

  const handleMediaPause = useCallback(
    (snapshot: MediaPlayerSnapshot) => {
      const effectiveDuration =
        previewMinutesLimitSeconds > 0
          ? Math.min(snapshot.duration || previewMinutesLimitSeconds, previewMinutesLimitSeconds)
          : snapshot.duration;
      const currentTime = Math.max(
        0,
        Math.round(
          effectiveDuration > 0
            ? Math.min(snapshot.currentTime, effectiveDuration)
            : snapshot.currentTime
        )
      );
      const isCompleted =
        effectiveDuration > 0 && currentTime >= Math.max(Math.round(effectiveDuration) - 1, 0);
      const percent =
        effectiveDuration > 0 ? (isCompleted ? 100 : Math.round((currentTime / effectiveDuration) * 100)) : 0;

      latestMediaSnapshotRef.current = {
        currentTime,
        duration: effectiveDuration,
        progressPercent: percent,
      };

      if (isCompleted) {
        completeCurrentMediaLesson(effectiveDuration);
        return;
      }

      if (canPersistProgress) {
        lastMediaSavedCheckpointRef.current = currentTime;
        persistProgress({
          progressPercent: percent,
          lastPosition: currentTime,
          isCompleted: false,
        });
      }
    },
    [
      canPersistProgress,
      completeCurrentMediaLesson,
      persistProgress,
      previewMinutesLimitSeconds,
    ]
  );

  const handleMediaEnded = useCallback(
    (snapshot: MediaPlayerSnapshot) => {
      const effectiveDuration =
        previewMinutesLimitSeconds > 0
          ? Math.min(snapshot.duration || previewMinutesLimitSeconds, previewMinutesLimitSeconds)
          : snapshot.duration;
      completeCurrentMediaLesson(Math.round(effectiveDuration));
    },
    [completeCurrentMediaLesson, previewMinutesLimitSeconds]
  );

  const handlePdfLoad = useCallback((data: { numPages: number }) => {
    latestPdfSnapshotRef.current.totalPages = previewPagesLimit
      ? Math.min(data.numPages, previewPagesLimit)
      : data.numPages;
  }, [previewPagesLimit]);

  const handlePdfProgress = useCallback(
    (percent: number, currentPage: number, totalPages: number) => {
      latestPdfSnapshotRef.current = {
        page: currentPage,
        totalPages,
      };

      const isCompleted = totalPages > 0 && currentPage >= totalPages;

      updateCurrentLessonProgress((current) => ({
        ...current,
        contentType: "pdf",
        progressPercent: isCompleted ? 100 : percent,
        lastPage: currentPage,
        lastPdfPage: currentPage,
        isCompleted: isCompleted || current.isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : current.completedAt ?? null,
      }));

      if (!canPersistProgress) {
        return;
      }

      clearPdfSaveTimeout();
      pdfSaveTimeoutRef.current = window.setTimeout(() => {
        persistProgress({
          progressPercent: isCompleted ? 100 : percent,
          lastPage: currentPage,
          isCompleted,
        });
      }, PDF_SAVE_DEBOUNCE_MS);

      if (isCompleted) {
        setResumePrompt(null);
      }
    },
    [canPersistProgress, clearPdfSaveTimeout, persistProgress, updateCurrentLessonProgress]
  );

  const handleResumePromptResume = useCallback(() => {
    if (!resumePrompt) {
      return;
    }

    if (resumePrompt.kind === "media") {
      setMediaStartTime(resumePrompt.position);
      mediaPlayerRef.current?.seekTo(resumePrompt.position);
    } else {
      setPdfScrollRequest({
        page: resumePrompt.page,
        nonce: ++pdfScrollNonceRef.current,
        behavior: "smooth",
      });
    }

    setResumePrompt(null);
  }, [resumePrompt]);

  const handleResumePromptStartOver = useCallback(() => {
    if (!resumePrompt) {
      return;
    }

    if (resumePrompt.kind === "media") {
      setMediaStartTime(0);
      mediaPlayerRef.current?.seekTo(0);
      updateCurrentLessonProgress((current) => ({
        ...current,
        progressPercent: 0,
        lastPosition: 0,
        watchedSeconds: 0,
        isCompleted: false,
        completedAt: null,
      }));
      latestMediaSnapshotRef.current = {
        currentTime: 0,
        duration: mediaDuration,
        progressPercent: 0,
      };

      if (canPersistProgress) {
        lastMediaSavedCheckpointRef.current = 0;
        persistProgress(
          {
            progressPercent: 0,
            lastPosition: 0,
            isCompleted: false,
          },
          { force: true }
        );
      }
    } else {
      const totalPages = latestPdfSnapshotRef.current.totalPages;
      const startingPercent = totalPages > 0 ? Math.round((1 / totalPages) * 100) : 0;

      setPdfInitialPage(1);
      setPdfScrollRequest({
        page: 1,
        nonce: ++pdfScrollNonceRef.current,
        behavior: "smooth",
      });
      updateCurrentLessonProgress((current) => ({
        ...current,
        progressPercent: startingPercent,
        lastPage: 1,
        lastPdfPage: 1,
        isCompleted: false,
        completedAt: null,
      }));
      latestPdfSnapshotRef.current.page = 1;

      if (canPersistProgress) {
        persistProgress(
          {
            progressPercent: startingPercent,
            lastPage: 1,
            isCompleted: false,
          },
          { force: true }
        );
      }
    }

    setResumePrompt(null);
  }, [
    canPersistProgress,
    mediaDuration,
    persistProgress,
    resumePrompt,
    updateCurrentLessonProgress,
  ]);

  const toggleLessonCompletion = useCallback(async () => {
    if (!hasFullCourseAccess || !viewerId) return;

    setManualCompletionPending(true);
    const nextCompletionState = currentLessonProgress.isCompleted ? "INCOMPLETE" : "COMPLETE";

    try {
      const response = await fetch(`/api/learn/lessons/${currentLesson.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualCompletionState: nextCompletionState,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle lesson completion (${response.status}).`);
      }

      const data = (await response.json()) as {
        progress?: {
          completedLessonIds?: string[];
          lessonProgressByLessonId?: Record<string, Partial<LessonProgressState>>;
        };
      };

      if (data.progress) {
        applyServerCourseProgress(data.progress);
      }

      if (nextCompletionState === "COMPLETE") {
        setResumePrompt(null);
      }

      markProgressSaved();
    } catch (error) {
      console.error("[lesson-player] Failed to toggle lesson completion.", error);
      markProgressSyncError();
    } finally {
      setManualCompletionPending(false);
    }
  }, [
    applyServerCourseProgress,
    currentLesson.id,
    currentLessonProgress.isCompleted,
    hasFullCourseAccess,
    markProgressSaved,
    markProgressSyncError,
    viewerId,
  ]);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined" && window.innerWidth < DESKTOP_BREAKPOINT) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearProgressFeedbackTimeout();
      clearPdfSaveTimeout();
    };
  }, [clearPdfSaveTimeout, clearProgressFeedbackTimeout]);

  useEffect(() => {
    const initialProgress = normalizeLessonProgressEntry(initialLessonProgressMap[currentLesson.id]);
    setResumePrompt(null);
    setPdfScrollRequest(null);
    setMediaDuration(0);
    setMediaStartTime(initialProgress.lastPosition != null && initialProgress.lastPosition <= 10 ? initialProgress.lastPosition : 0);
    setPdfInitialPage(initialProgress.lastPage != null && initialProgress.lastPage <= 1 ? initialProgress.lastPage : 1);
    lastPersistedPayloadRef.current = "";
    lastMediaSavedCheckpointRef.current = initialProgress.lastPosition ?? 0;
    latestMediaSnapshotRef.current = initialProgress.lastPosition
      ? {
          currentTime: initialProgress.lastPosition,
          duration: 0,
          progressPercent: initialProgress.progressPercent,
        }
      : null;
    latestPdfSnapshotRef.current = {
      page: initialProgress.lastPage ?? 1,
      totalPages: 0,
    };
  }, [currentLesson.id, initialLessonProgressMap]);

  useEffect(() => {
    if (!pdfViewportRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const viewport = pdfViewportRef.current;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? viewport.clientWidth;
      setPdfViewportWidth(Math.round(width));
    });

    observer.observe(viewport);
    setPdfViewportWidth(viewport.clientWidth);

    return () => observer.disconnect();
  }, [currentLesson.id, currentContentType]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const payload = {
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      lessonId: currentLesson.id,
      lessonTitle: currentLesson.title,
      contentType: currentContentType,
      progressPercent: currentLessonProgress.progressPercent,
      href: `/learn/${course.slug}/${currentLesson.id}`,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem("lastViewedLesson", JSON.stringify(payload));
  }, [
    course.id,
    course.slug,
    course.title,
    currentContentType,
    currentLesson.id,
    currentLesson.title,
    currentLessonProgress.progressPercent,
  ]);

  useEffect(() => {
    if (!isMounted || !viewerId || noteContent === lastSavedContent) return;

    const timer = window.setTimeout(async () => {
      if (!noteContent.trim() || noteContent === lastSavedContent) return;

      setIsNoteSaving(true);
      try {
        const response = await fetch(`/api/learn/lessons/${currentLesson.id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: noteContent }),
        });

        if (response.ok) {
          setLastSavedContent(noteContent);
        }
      } catch (error) {
        console.error("[lesson-player] Failed to autosave note.", error);
      } finally {
        setIsNoteSaving(false);
      }
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [currentLesson.id, isMounted, lastSavedContent, noteContent, viewerId]);

  useEffect(() => {
    if (!isMounted || !canPersistProgress || !currentContentType) {
      return;
    }

    let cancelled = false;

    const loadSavedProgress = async () => {
      try {
        const response = await fetch(`/api/progress?lessonId=${currentLesson.id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { progress?: Partial<LessonProgressState> | null };
        if (cancelled || !data.progress) {
          return;
        }

        const normalized = normalizeLessonProgressEntry(data.progress);
        setLessonProgressMap((prev) => ({
          ...prev,
          [currentLesson.id]: normalized,
        }));

        if (normalized.isCompleted) {
          setResumePrompt(null);
          return;
        }

        if (currentContentType === "pdf") {
          if ((normalized.lastPage ?? 1) > 1) {
            setPdfInitialPage(1);
            setResumePrompt({ kind: "pdf", page: normalized.lastPage ?? 1 });
          } else {
            setPdfInitialPage(normalized.lastPage ?? 1);
          }
          return;
        }

        if ((normalized.lastPosition ?? 0) > 10) {
          setMediaStartTime(0);
          setResumePrompt({ kind: "media", position: normalized.lastPosition ?? 0 });
        } else {
          setMediaStartTime(normalized.lastPosition ?? 0);
        }
      } catch (error) {
        console.error("[lesson-player] Failed to load saved lesson progress.", error);
      }
    };

    void loadSavedProgress();

    return () => {
      cancelled = true;
    };
  }, [canPersistProgress, currentContentType, currentLesson.id, isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const handlePageHide = () => flushProgressBeforeUnload();
    const handleBeforeUnload = () => flushProgressBeforeUnload();

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [flushProgressBeforeUnload, isMounted]);

  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a0f1a] to-slate-950 text-white">
      <header className="relative z-40 flex h-20 shrink-0 items-center justify-between border-b border-white/5 bg-gradient-to-r from-[#04070d] via-[#0a0f1a] to-[#04070d] px-4 shadow-2xl backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-xl p-3 text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:shadow-lg"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link
            href="/courses"
            className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white sm:flex"
          >
            Back to Courses
          </Link>
        </div>

        <div className="flex-1 px-4">
          <h1 className="truncate text-sm font-bold text-white">{currentLesson.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {askAiEnabled ? (
            <button
              onClick={() => setAskAiOpen(!askAiOpen)}
              className={cn(
                "rounded-xl p-3 transition-all duration-200",
                askAiOpen
                  ? "bg-primary-blue/20 text-primary-blue shadow-lg shadow-primary-blue/20"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              )}
              title="Ask AI"
            >
              <Sparkles className="h-5 w-5" />
            </button>
          ) : null}

          <button
            onClick={() => setNotesPanelOpen(!notesPanelOpen)}
            className={cn(
              "rounded-xl p-3 transition-all duration-200",
              notesPanelOpen
                ? "bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/20"
                : "text-slate-400 hover:bg-white/10 hover:text-white"
            )}
            title="Notes"
          >
            <NotebookText className="h-5 w-5" />
          </button>

          {progressSyncState !== "idle" ? (
            <div className="rounded-xl p-3">
              {progressSyncState === "saving" ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary-blue" />
              ) : null}
              {progressSyncState === "saved" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : null}
              {progressSyncState === "error" ? (
                <AlertCircle className="h-5 w-5 text-rose-400" />
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence>
          {sidebarOpen ? (
            <div className="flex w-80 flex-col overflow-hidden border-r border-white/5 bg-gradient-to-b from-slate-900/50 to-slate-950/50 shadow-2xl backdrop-blur-sm">
              <div className="border-b border-white/5 px-4 py-4">
                <h2 className="mb-1 text-sm font-bold text-white">{course.title}</h2>
                <p className="text-xs text-slate-400">Curriculum</p>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto">
                <div className="space-y-6 p-4">
                  {modules.map((module) => (
                    <div key={module.id} className="space-y-2">
                      <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                        {module.title}
                      </h3>
                      <div className="space-y-1">
                        {module.lessons.map((lesson) => {
                          const isCurrentLesson = lesson.id === currentLesson.id;
                          const isUnlocked = isLessonUnlocked(lesson);
                          const lessonProgress = normalizeLessonProgressEntry(lessonProgressMap[lesson.id]);
                          const isCompleted = lessonProgress.isCompleted || lessonProgress.progressPercent === 100;
                          const LessonIcon = getLessonSidebarIcon(lesson);

                          return (
                            <Link
                              key={lesson.id}
                              href={`/learn/${course.slug}/${lesson.id}`}
                              className={cn(
                                "group block rounded-lg px-3 py-2.5 text-xs font-medium transition-all duration-200",
                                isCurrentLesson
                                  ? "bg-gradient-to-r from-primary-blue to-primary-blue/80 text-white shadow-lg shadow-primary-blue/30"
                                  : "text-slate-300 hover:bg-white/10 hover:text-white",
                                !isUnlocked && "cursor-not-allowed opacity-50"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  {!isUnlocked ? (
                                    <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                                  ) : (
                                    <LessonIcon className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover:text-primary-blue" />
                                  )}
                                  <span className="truncate">{lesson.title}</span>
                                </div>
                                {isCompleted ? (
                                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </span>
                                ) : lessonProgress.progressPercent > 0 ? (
                                  <span className="shrink-0 text-[10px] font-bold text-primary-blue">
                                    {lessonProgress.progressPercent}%
                                  </span>
                                ) : null}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 bg-white/[0.02] p-4">
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Course Progress</span>
                    <span className="text-xs font-bold text-primary-blue">{overallProgress}%</span>
                  </div>
                  <ProgressBar progress={overallProgress} size="sm" />
                  <p className="mt-2 text-[11px] text-slate-400">
                    {completedLessons}/{allLessons.length} lessons completed
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </AnimatePresence>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6">
              <div className="mx-auto max-w-7xl">
                {/* ── Media area ── */}
                <div className="relative">
                  {currentContentType === "pdf" && primaryAssetUrl ? (
                    <div
                      ref={pdfViewportRef}
                      className="min-h-[500px] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white to-slate-100 shadow-2xl"
                    >
                      <LessonPdfViewer
                        file={primaryAssetUrl}
                        lessonId={currentLesson.id}
                        viewportWidth={pdfViewportWidth || pdfViewportRef.current?.clientWidth || 800}
                        onProgress={handlePdfProgress}
                        onLoad={handlePdfLoad}
                        initialPage={pdfInitialPage}
                        maxPages={previewPagesLimit}
                        scrollRequest={pdfScrollRequest}
                      />
                    </div>
                  ) : null}

                  {currentContentType === "video" && primaryAssetUrl ? (
                    <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl" style={{ aspectRatio: "16/9" }}>
                      <MediaPlayer
                        ref={mediaPlayerRef}
                        src={primaryAssetUrl}
                        type="video"
                        initialTime={mediaStartTime}
                        maxDuration={previewMinutesLimitSeconds || undefined}
                        isLocked={isPreviewOnlyLesson && previewMinutesLimitSeconds > 0}
                        onLoadedMetadata={(duration) => setMediaDuration(duration)}
                        onTimeUpdate={handleMediaProgress}
                        onPause={handleMediaPause}
                        onEnded={handleMediaEnded}
                      />
                    </div>
                  ) : null}

                  {currentContentType === "audio" && primaryAssetUrl ? (
                    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl" style={{ minHeight: 340 }}>
                      <MediaPlayer
                        ref={mediaPlayerRef}
                        src={primaryAssetUrl}
                        type="audio"
                        initialTime={mediaStartTime}
                        maxDuration={previewMinutesLimitSeconds || undefined}
                        isLocked={isPreviewOnlyLesson && previewMinutesLimitSeconds > 0}
                        onLoadedMetadata={(duration) => setMediaDuration(duration)}
                        onTimeUpdate={handleMediaProgress}
                        onPause={handleMediaPause}
                        onEnded={handleMediaEnded}
                      />
                    </div>
                  ) : null}

                  {!currentContentType || !primaryAssetUrl ? (
                    <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl">
                      <AlertCircle className="h-12 w-12 text-rose-400" />
                      <div className="max-w-md text-center">
                        <h3 className="mb-2 text-lg font-bold text-white">
                          {resolvedLessonRenderer.fallbackTitle}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {resolvedLessonRenderer.fallbackMessage}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <AnimatePresence>
                    <ResumeOverlay
                      prompt={resumePrompt}
                      onResume={handleResumePromptResume}
                      onStartOver={handleResumePromptStartOver}
                    />
                  </AnimatePresence>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="mb-1.5 text-lg font-bold text-white">{currentLesson.title}</h2>
                      {currentLesson.description ? (
                        <p className="text-sm leading-relaxed text-slate-300">
                          {currentLesson.description}
                        </p>
                      ) : null}
                    </div>

                    {currentLessonProgress.isCompleted ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">Progress</span>
                        <span className="text-xs font-bold text-primary-blue">
                          {currentLessonProgress.progressPercent}%
                        </span>
                      </div>
                      <ProgressBar progress={currentLessonProgress.progressPercent} size="md" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    {currentLessonProgress.isCompleted ? (
                      <>
                        <button
                          onClick={toggleLessonCompletion}
                          disabled={manualCompletionPending}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition-all duration-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {manualCompletionPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Mark Incomplete
                        </button>
                        <div className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-300">Completed</span>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={toggleLessonCompletion}
                        disabled={manualCompletionPending}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-blue/30 transition-all duration-200 hover:bg-primary-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {manualCompletionPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Mark as Complete
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  {currentIndex > 0 ? (
                    <Link
                      href={`/learn/${course.slug}/${allLessons[currentIndex - 1].id}`}
                      className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Link>
                  ) : (
                    <span />
                  )}
                  <div className="text-xs font-semibold text-slate-400">
                    {currentIndex + 1} / {allLessons.length}
                  </div>
                  {currentIndex < allLessons.length - 1 ? (
                    <Link
                      href={`/learn/${course.slug}/${allLessons[currentIndex + 1].id}`}
                      className="flex items-center gap-2 rounded-lg bg-primary-blue px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-blue/30 transition-all duration-200 hover:bg-primary-blue/90"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {notesPanelOpen ? (
          <LessonNotesPanel
            lessonId={currentLesson.id}
            viewerId={viewerId}
            initialContent={noteContent}
            isOpen={notesPanelOpen}
            onClose={() => setNotesPanelOpen(false)}
            onContentChange={setNoteContent}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {askAiOpen && askAiEnabled ? (
          <div className="fixed bottom-6 right-6 z-50 max-w-md">
            <AskAI
              courseTitle={course.title}
              onClose={() => setAskAiOpen(false)}
              assistantLabel={askAiAssistantLabel}
              variant="overlay"
            />
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
