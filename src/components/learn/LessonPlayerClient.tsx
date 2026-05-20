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
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
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
import {
  getLessonAssetDisplayTitle,
  inferLessonAssetKind,
  sortLessonAssets,
} from "@/lib/lesson-assets";
import { resolveMediaUrl } from "@/lib/media";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LessonNotesPanel } from "./LessonNotesPanel";
import { useToast } from "@/components/ui/ToastProvider";

const LessonPdfViewer = dynamic(() => import("./LessonPdfViewer"), {
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
type CourseLessonAsset = NonNullable<CourseLesson["assets"]>[number];
type LessonRendererKind = "pdf" | "video" | "audio";
type LessonResourceKind = LessonRendererKind | "image" | "file";

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

type ResolvedLessonAsset = CourseLessonAsset & {
  displayTitle: string;
  kind: LessonResourceKind;
  resolvedUrl: string;
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

type ResourceProgressState = {
  isCompleted: boolean;
  kind: "media" | "pdf" | "image";
  lastPage?: number;
  lastPosition?: number;
  progressPercent: number;
  updatedAt: number;
};

const DESKTOP_BREAKPOINT = 1024;
const MEDIA_SAVE_INTERVAL_SECONDS = 30;
const PDF_SAVE_DEBOUNCE_MS = 500;
const SAVED_PROGRESS_FEEDBACK_MS = 2500;
const SIDEBAR_STORAGE_KEY = "lesson-player-sidebar-open";
const RESOURCE_PROGRESS_STORAGE_KEY = "lesson-player-resource-progress";

function getResourceProgressKey(lessonId: string, assetId: string) {
  return `${lessonId}:${assetId}`;
}

function normalizeResourceProgressMap(value: unknown) {
  if (!value || typeof value !== "object") {
    return {} as Record<string, ResourceProgressState>;
  }

  const entries = Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const resourceEntry = entry as Partial<ResourceProgressState>;
    const kind =
      resourceEntry.kind === "pdf"
        ? "pdf"
        : resourceEntry.kind === "media"
          ? "media"
          : resourceEntry.kind === "image"
            ? "image"
            : null;

    if (!kind) {
      return [];
    }

    return [[
      key,
      {
        isCompleted: Boolean(resourceEntry.isCompleted),
        kind,
        lastPage:
          typeof resourceEntry.lastPage === "number" && Number.isFinite(resourceEntry.lastPage)
            ? Math.max(1, Math.round(resourceEntry.lastPage))
            : undefined,
        lastPosition:
          typeof resourceEntry.lastPosition === "number" && Number.isFinite(resourceEntry.lastPosition)
            ? Math.max(0, Math.round(resourceEntry.lastPosition))
            : undefined,
        progressPercent:
          typeof resourceEntry.progressPercent === "number" && Number.isFinite(resourceEntry.progressPercent)
            ? clampPercentage(resourceEntry.progressPercent)
            : 0,
        updatedAt:
          typeof resourceEntry.updatedAt === "number" && Number.isFinite(resourceEntry.updatedAt)
            ? resourceEntry.updatedAt
            : Date.now(),
      } satisfies ResourceProgressState,
    ]];
  });

  return Object.fromEntries(entries) as Record<string, ResourceProgressState>;
}

function resourceProgressToLessonProgressState(
  resourceProgress?: ResourceProgressState | null
): LessonProgressState {
  return normalizeLessonProgressEntry({
    progressPercent: resourceProgress?.progressPercent ?? 0,
    lastPosition: resourceProgress?.lastPosition ?? null,
    lastPage: resourceProgress?.lastPage ?? null,
    lastPdfPage: resourceProgress?.lastPage ?? null,
    watchedSeconds: resourceProgress?.lastPosition ?? 0,
    isCompleted: resourceProgress?.isCompleted ?? false,
  });
}

function getAssetProgressState(
  lessonId: string,
  asset: ResolvedLessonAsset | null,
  resourceProgressMap: Record<string, ResourceProgressState>,
  fallback?: LessonProgressState | null
) {
  if (!asset) {
    return normalizeLessonProgressEntry(fallback);
  }

  return resourceProgressMap[getResourceProgressKey(lessonId, asset.id)]
    ? resourceProgressToLessonProgressState(
        resourceProgressMap[getResourceProgressKey(lessonId, asset.id)]
      )
    : normalizeLessonProgressEntry(fallback);
}

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

function resolveLessonAssets(lesson: CourseLesson): ResolvedLessonAsset[] {
  const assets = sortLessonAssets(lesson.assets ?? []);

  if (assets.length > 0) {
    return [...assets]
      .sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? -1 : 1;
        }

        return left.sortOrder - right.sortOrder;
      })
      .map((asset) => {
        const resolvedUrl =
          resolveMediaUrl({
            url: asset.assetUrl,
            path: asset.assetPath,
            fallback: "",
          }) || "";
        const kind = inferLessonAssetKind(asset);

        return {
          ...asset,
          displayTitle: asset.title || getLessonAssetDisplayTitle(asset),
          kind:
            kind === "PDF"
              ? "pdf"
              : kind === "VIDEO"
                ? "video"
                : kind === "AUDIO"
                  ? "audio"
                  : kind === "IMAGE"
                    ? "image"
                  : "file",
          resolvedUrl,
        } satisfies ResolvedLessonAsset;
      })
      .filter((asset) => asset.resolvedUrl);
  }

  const fallbackUrl =
    resolveMediaUrl({
      url: lesson.assetUrl || lesson.videoUrl,
      path: lesson.assetPath,
      fallback: "",
    }) || "";

  if (!fallbackUrl) {
    return [];
  }

  const kind = inferLessonAssetKind({
    assetUrl: fallbackUrl,
  });

  return [
    {
      id: `legacy-${lesson.id}`,
      lessonId: lesson.id,
      assetType:
        kind === "PDF" ? "PDF" : kind === "VIDEO" ? "VIDEO" : kind === "IMAGE" ? "IMAGE" : "FILE",
      assetUrl: fallbackUrl,
      assetPath: lesson.assetPath,
      fileName: getLessonAssetDisplayTitle({ assetUrl: fallbackUrl }),
      mimeType: undefined,
      sizeBytes: undefined,
      title: getLessonAssetDisplayTitle({ assetUrl: fallbackUrl }),
      displayTitle: getLessonAssetDisplayTitle({ assetUrl: fallbackUrl }),
      isPrimary: true,
      sortOrder: 0,
      kind:
        kind === "PDF"
          ? "pdf"
          : kind === "VIDEO"
            ? "video"
            : kind === "AUDIO"
              ? "audio"
              : kind === "IMAGE"
                ? "image"
              : "file",
      resolvedUrl: fallbackUrl,
    },
  ];
}

function resolveLessonRenderer(
  lesson: CourseLesson,
  lessonAssets: ResolvedLessonAsset[]
): ResolvedLessonRenderer {
  const primaryAssetUrl = lessonAssets[0]?.resolvedUrl ?? null;
  const assetTypeLabel = normalizeLessonAssetType(lesson);
  const inferredRenderer =
    lessonAssets[0]?.kind === "pdf" ||
    lessonAssets[0]?.kind === "video" ||
    lessonAssets[0]?.kind === "audio"
      ? lessonAssets[0].kind
      : inferLessonRendererFromUrl(primaryAssetUrl);

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

function getLessonResourceBadge(asset: ResolvedLessonAsset) {
  const url = asset.resolvedUrl.toLowerCase();
  const mimeType = asset.mimeType?.toLowerCase() || "";

  if (url.endsWith(".docx") || mimeType.includes("wordprocessingml")) return "DOCX";
  if (url.endsWith(".xlsx") || mimeType.includes("spreadsheetml")) return "XLSX";
  if (url.endsWith(".pptx") || mimeType.includes("presentationml")) return "PPTX";
  if (url.endsWith(".pdf") || mimeType.includes("pdf") || asset.kind === "pdf") return "PDF";
  if (asset.kind === "video") return "VIDEO";
  if (asset.kind === "audio") return "AUDIO";
  if (asset.kind === "image") return "IMAGE";
  return "FILE";
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
  const router = useRouter();
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
  const [isMediaFullscreen, setIsMediaFullscreen] = useState(false);
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [fetchedLessonAssets, setFetchedLessonAssets] = useState<CourseLesson["assets"] | null>(null);
  const [resourceProgressMap, setResourceProgressMap] = useState<Record<string, ResourceProgressState>>({});
  const [activeResourceStartTime, setActiveResourceStartTime] = useState(0);
  const [activeResourceInitialPage, setActiveResourceInitialPage] = useState(1);
  const [resourceResumePrompt, setResourceResumePrompt] = useState<ResumePromptState>(null);
  const [currentLessonId, setCurrentLessonId] = useState(initialLessonId);
  const [pendingLessonId, setPendingLessonId] = useState(initialLessonId);
  const [isLessonNavigating, setIsLessonNavigating] = useState(false);
  const { toast } = useToast();

  const modules = course.modules ?? [];
  const allLessons = useMemo(() => modules.flatMap((module) => module.lessons), [modules]);
  const currentLesson =
    allLessons.find((lesson) => lesson.id === currentLessonId) ?? allLessons[0];
  const currentIndex = allLessons.findIndex((lesson) => lesson.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const lessonForRendering = useMemo(
    () =>
      fetchedLessonAssets === null
        ? currentLesson
        : {
            ...currentLesson,
            assets: fetchedLessonAssets,
          },
    [currentLesson, fetchedLessonAssets]
  );
  const resolvedLessonAssets = useMemo(
    () => resolveLessonAssets(lessonForRendering),
    [lessonForRendering]
  );
  const resolvedLessonRenderer = useMemo(
    () => resolveLessonRenderer(lessonForRendering, resolvedLessonAssets),
    [lessonForRendering, resolvedLessonAssets]
  );
  const currentLessonProgress = normalizeLessonProgressEntry(lessonProgressMap[currentLesson.id]);
  const currentContentType = resolvedLessonRenderer.kind;
  const primaryAssetUrl = resolvedLessonRenderer.primaryAssetUrl;
  const primaryLessonAsset = resolvedLessonAssets[0] ?? null;
  const lessonAssetRows = resolvedLessonAssets;
  const activeResourceAsset =
    lessonAssetRows.find((asset) => asset.id === activeResourceId) ?? null;
  const mainImageAssets =
    activeResourceId && activeResourceAsset?.kind === "image"
      ? [activeResourceAsset]
      : primaryLessonAsset?.kind === "image"
        ? resolvedLessonAssets.filter((asset) => asset.kind === "image")
        : [];
  const activeResourceProgress =
    activeResourceAsset
      ? resourceProgressMap[getResourceProgressKey(currentLesson.id, activeResourceAsset.id)] ?? null
      : null;
  const activeViewerAsset = activeResourceAsset ?? primaryLessonAsset;
  const activeViewerKind =
    activeResourceAsset
      ? activeResourceAsset.kind === "pdf" ||
        activeResourceAsset.kind === "video" ||
        activeResourceAsset.kind === "audio"
        ? activeResourceAsset.kind
        : null
      : currentContentType;
  const activeViewerUrl = activeResourceAsset?.resolvedUrl ?? primaryAssetUrl;
  const shouldShowPlayerSkeleton =
    Boolean(activeViewerKind) && !activeViewerUrl;
  const activeResourcePdfUrl = activeResourceAsset?.resolvedUrl ?? null;
  const isPreviewOnlyLesson = currentLesson.isPreview && !hasFullCourseAccess;
  const previewPagesLimit =
    isPreviewOnlyLesson && activeViewerKind === "pdf"
      ? currentLesson.previewPages ?? undefined
      : undefined;
  const previewMinutesLimitSeconds =
    isPreviewOnlyLesson &&
    (activeViewerKind === "video" || activeViewerKind === "audio") &&
    currentLesson.previewMinutes
      ? currentLesson.previewMinutes * 60
      : 0;
  const canPersistProgress = Boolean(viewerId && hasFullCourseAccess && currentContentType);
  const { completedLessons, overallProgress } = useMemo(
    () => calculateCourseProgress(allLessons, lessonProgressMap),
    [allLessons, lessonProgressMap]
  );
  const currentAssetProgress = useMemo(
    () =>
      getAssetProgressState(
        currentLesson.id,
        activeViewerAsset,
        resourceProgressMap,
        !activeResourceAsset ? currentLessonProgress : null
      ),
    [
      activeResourceAsset,
      activeViewerAsset,
      currentLesson.id,
      currentLessonProgress,
      resourceProgressMap,
    ]
  );
  const currentLessonAssetsCompleted = useMemo(() => {
    if (lessonAssetRows.length === 0) {
      return currentLessonProgress.isCompleted;
    }

    return lessonAssetRows.every((asset, index) => {
      if (index === 0) {
        return currentLessonProgress.isCompleted;
      }

      return Boolean(resourceProgressMap[getResourceProgressKey(currentLesson.id, asset.id)]?.isCompleted);
    });
  }, [currentLesson.id, currentLessonProgress.isCompleted, lessonAssetRows, resourceProgressMap]);

  useEffect(() => {
    setCurrentLessonId(initialLessonId);
    setPendingLessonId(initialLessonId);
    setIsLessonNavigating(false);
  }, [initialLessonId]);

  useEffect(() => {
    if (nextLesson) {
      router.prefetch(`/learn/${course.slug}/${nextLesson.id}`);
      void fetch(`/api/learn/lessons/${nextLesson.id}/assets`, { cache: "force-cache" }).catch(() => undefined);
    }

    if (prevLesson) {
      router.prefetch(`/learn/${course.slug}/${prevLesson.id}`);
      void fetch(`/api/learn/lessons/${prevLesson.id}/assets`, { cache: "force-cache" }).catch(() => undefined);
    }
  }, [course.slug, currentLesson.id, nextLesson, prevLesson, router]);

  const pdfViewportRef = useRef<HTMLDivElement | null>(null);
  const mediaPlayerRef = useRef<MediaPlayerHandle | null>(null);
  const progressFeedbackTimeoutRef = useRef<number | null>(null);
  const pdfSaveTimeoutRef = useRef<number | null>(null);
  const progressSaveQueueRef = useRef(Promise.resolve());
  const assetProgressSaveQueueRef = useRef(Promise.resolve());
  const lastPersistedPayloadRef = useRef("");
  const lastAssetPersistedPayloadRef = useRef<Record<string, string>>({});
  const lastMediaSavedCheckpointRef = useRef(currentLessonProgress.lastPosition ?? 0);
  const lastActiveResourceSavedCheckpointRef = useRef(0);
  const latestMediaSnapshotRef = useRef<MediaPlayerSnapshot | null>(null);
  const latestActiveResourceMediaSnapshotRef = useRef<MediaPlayerSnapshot | null>(null);
  const selectedAssetProgressFetchKeyRef = useRef<string | null>(null);
  const latestPdfSnapshotRef = useRef({
    page: currentLessonProgress.lastPage ?? 1,
    totalPages: 0,
  });
  const autoCompletedPdfLessonRef = useRef<string | null>(null);
  const pdfScrollNonceRef = useRef(0);
  const activeResourceResumeInitKeyRef = useRef<string | null>(null);
  const fullscreenActionButtonClass =
    "flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white/85 backdrop-blur-md transition hover:bg-black/55 hover:text-white";

  const isLessonUnlocked = useCallback(
    (lesson: CourseLesson) => hasFullCourseAccess || lesson.isPreview,
    [hasFullCourseAccess]
  );

  const handleLessonSelect = useCallback(
    (lessonId: string, assetId?: string | null) => {
      setPendingLessonId(lessonId);
      setIsLessonNavigating(true);
      window.setTimeout(() => {
        setCurrentLessonId(lessonId);
        setActiveResourceId(assetId ?? null);
        setIsLessonNavigating(false);
        setPendingLessonId(lessonId);
        window.history.replaceState(
          window.history.state,
          "",
          `/learn/${course.slug}/${initialLessonId}?lesson=${lessonId}`
        );
      }, 150);
    },
    [course.slug, initialLessonId]
  );

  useEffect(() => {
    setActiveResourceId(null);
  }, [currentLesson.id]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(RESOURCE_PROGRESS_STORAGE_KEY);
      if (!rawValue) {
        return;
      }

      setResourceProgressMap(normalizeResourceProgressMap(JSON.parse(rawValue)));
    } catch (error) {
      console.error("[lesson-player] Failed to load resource progress.", error);
    }
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    window.localStorage.setItem(
      RESOURCE_PROGRESS_STORAGE_KEY,
      JSON.stringify(resourceProgressMap)
    );
  }, [isMounted, resourceProgressMap]);

  useEffect(() => {
    const activeResourceKey = activeResourceAsset
      ? getResourceProgressKey(currentLesson.id, activeResourceAsset.id)
      : null;

    if (!activeResourceKey) {
      activeResourceResumeInitKeyRef.current = null;
      latestActiveResourceMediaSnapshotRef.current = null;
      lastActiveResourceSavedCheckpointRef.current = 0;
      setActiveResourceStartTime(0);
      setActiveResourceInitialPage(1);
      setResourceResumePrompt(null);
      return;
    }

    if (activeResourceResumeInitKeyRef.current !== activeResourceKey) {
      latestActiveResourceMediaSnapshotRef.current = null;
      lastActiveResourceSavedCheckpointRef.current = 0;
      setActiveResourceStartTime(0);
      setActiveResourceInitialPage(1);
      setResourceResumePrompt(null);
    }

    const progressEntry = resourceProgressMap[activeResourceKey];

    if (!progressEntry || activeResourceResumeInitKeyRef.current === activeResourceKey) {
      return;
    }

    activeResourceResumeInitKeyRef.current = activeResourceKey;
    lastActiveResourceSavedCheckpointRef.current = progressEntry.lastPosition ?? 0;

    if (progressEntry.isCompleted) {
      if (progressEntry.kind === "pdf" && progressEntry.lastPage) {
        setActiveResourceInitialPage(progressEntry.lastPage);
      }

      if (progressEntry.kind === "media" && progressEntry.lastPosition) {
        setActiveResourceStartTime(progressEntry.lastPosition);
      }

      return;
    }

    if (progressEntry.kind === "pdf") {
      if ((progressEntry.lastPage ?? 1) > 1) {
        setActiveResourceInitialPage(1);
        setResourceResumePrompt({ kind: "pdf", page: progressEntry.lastPage ?? 1 });
      } else {
        setActiveResourceInitialPage(progressEntry.lastPage ?? 1);
      }
      return;
    }

    if ((progressEntry.lastPosition ?? 0) > 10) {
      setActiveResourceStartTime(0);
      setResourceResumePrompt({ kind: "media", position: progressEntry.lastPosition ?? 0 });
    } else {
      setActiveResourceStartTime(progressEntry.lastPosition ?? 0);
    }
  }, [activeResourceAsset, currentLesson.id, resourceProgressMap]);


  useEffect(() => {
    let cancelled = false;

    setFetchedLessonAssets(null);

    async function loadLessonAssets() {
      try {
        const response = await fetch(`/api/learn/lessons/${currentLesson.id}/assets`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Lesson assets request failed with ${response.status}.`);
        }

        const payload = (await response.json()) as {
          assets?: CourseLesson["assets"];
        };

        if (!cancelled) {
          setFetchedLessonAssets(Array.isArray(payload.assets) ? payload.assets : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[lesson-player] Unable to refresh lesson assets.", error);
          setFetchedLessonAssets(currentLesson.assets ?? null);
        }
      }
    }

    void loadLessonAssets();

    return () => {
      cancelled = true;
    };
  }, [currentLesson.id, currentLesson.assets]);

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

  const updateResourceProgress = useCallback(
    (
      assetId: string,
      nextState: Partial<ResourceProgressState> & Pick<ResourceProgressState, "kind">
    ) => {
      const progressKey = getResourceProgressKey(currentLesson.id, assetId);

      setResourceProgressMap((prev) => {
        const current = prev[progressKey];

        return {
          ...prev,
          [progressKey]: {
            isCompleted: nextState.isCompleted ?? current?.isCompleted ?? false,
            kind: nextState.kind,
            lastPage: nextState.lastPage ?? current?.lastPage,
            lastPosition: nextState.lastPosition ?? current?.lastPosition,
            progressPercent: clampPercentage(
              nextState.progressPercent ?? current?.progressPercent ?? 0
            ),
            updatedAt: Date.now(),
          },
        };
      });
    },
    [currentLesson.id]
  );

  function handleActiveResourcePdfProgress(percent: number, currentPage: number, totalPages: number) {
    if (!activeResourceAsset || activeResourceAsset.kind !== "pdf") {
      return;
    }

    updateResourceProgress(activeResourceAsset.id, {
      kind: "pdf",
      isCompleted: totalPages > 0 && currentPage >= totalPages,
      lastPage: currentPage,
      progressPercent: percent,
    });
    void persistAssetProgress(activeResourceAsset, {
      progressPercent: percent,
      lastPage: currentPage,
      isCompleted: totalPages > 0 && currentPage >= totalPages,
    });
  }

  function handleActiveResourceMediaProgress(snapshot: MediaPlayerSnapshot) {
    if (!activeResourceAsset || (activeResourceAsset.kind !== "video" && activeResourceAsset.kind !== "audio")) {
      return;
    }

    updateResourceProgress(activeResourceAsset.id, {
      kind: "media",
      isCompleted:
        snapshot.duration > 0 &&
        snapshot.currentTime >= Math.max(snapshot.duration - 1, 0),
      lastPosition: snapshot.currentTime,
      progressPercent: snapshot.progressPercent,
    });

    latestActiveResourceMediaSnapshotRef.current = {
      currentTime: Math.max(0, Math.round(snapshot.currentTime)),
      duration: snapshot.duration,
      progressPercent: snapshot.progressPercent,
    };

    if (
      Math.abs(
        Math.round(snapshot.currentTime) - lastActiveResourceSavedCheckpointRef.current
      ) >= MEDIA_SAVE_INTERVAL_SECONDS
    ) {
      lastActiveResourceSavedCheckpointRef.current = Math.max(
        lastActiveResourceSavedCheckpointRef.current,
        Math.round(snapshot.currentTime)
      );
      void persistAssetProgress(activeResourceAsset, {
        progressPercent: snapshot.progressPercent,
        lastPosition: Math.round(snapshot.currentTime),
        isCompleted:
          snapshot.duration > 0 &&
          snapshot.currentTime >= Math.max(snapshot.duration - 1, 0),
      });
    }
  }

  function handleActiveResourceMediaPause(snapshot: MediaPlayerSnapshot) {
    if (!activeResourceAsset || (activeResourceAsset.kind !== "video" && activeResourceAsset.kind !== "audio")) {
      return;
    }

    const currentTime = Math.max(0, Math.round(snapshot.currentTime));
    latestActiveResourceMediaSnapshotRef.current = {
      currentTime,
      duration: snapshot.duration,
      progressPercent: snapshot.progressPercent,
    };
    lastActiveResourceSavedCheckpointRef.current = Math.max(
      lastActiveResourceSavedCheckpointRef.current,
      currentTime
    );

    void persistAssetProgress(activeResourceAsset, {
      progressPercent: snapshot.progressPercent,
      lastPosition: currentTime,
      isCompleted:
        snapshot.duration > 0 &&
        snapshot.currentTime >= Math.max(snapshot.duration - 1, 0),
    });
  }

  function handleActiveResourceMediaEnded(snapshot: MediaPlayerSnapshot) {
    if (!activeResourceAsset || (activeResourceAsset.kind !== "video" && activeResourceAsset.kind !== "audio")) {
      return;
    }

    latestActiveResourceMediaSnapshotRef.current = {
      currentTime: Math.max(0, Math.round(snapshot.currentTime)),
      duration: snapshot.duration,
      progressPercent: 100,
    };
    lastActiveResourceSavedCheckpointRef.current = Math.max(
      lastActiveResourceSavedCheckpointRef.current,
      Math.round(snapshot.currentTime)
    );

    updateResourceProgress(activeResourceAsset.id, {
      kind: "media",
      isCompleted: true,
      lastPosition: Math.round(snapshot.currentTime),
      progressPercent: 100,
    });

    void persistAssetProgress(activeResourceAsset, {
      progressPercent: 100,
      lastPosition: null,
      isCompleted: true,
    });
  }

  const handleResourceResumePromptResume = useCallback(() => {
    if (!resourceResumePrompt) {
      return;
    }

    if (resourceResumePrompt.kind === "pdf") {
      setActiveResourceInitialPage(resourceResumePrompt.page);
    } else {
      setActiveResourceStartTime(resourceResumePrompt.position);
    }

    setResourceResumePrompt(null);
  }, [resourceResumePrompt]);

  const handleResourceResumePromptStartOver = useCallback(() => {
    if (!activeResourceAsset) {
      return;
    }

    if (resourceResumePrompt?.kind === "pdf") {
      setActiveResourceInitialPage(1);
      updateResourceProgress(activeResourceAsset.id, {
        kind: "pdf",
        isCompleted: false,
        lastPage: 1,
        progressPercent: 0,
      });
    } else {
      setActiveResourceStartTime(0);
      updateResourceProgress(activeResourceAsset.id, {
        kind: "media",
        isCompleted: false,
        lastPosition: 0,
        progressPercent: 0,
      });
    }

    setResourceResumePrompt(null);
  }, [activeResourceAsset, resourceResumePrompt, updateResourceProgress]);

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

  const updateCurrentLessonFromAssetProgress = useCallback(
    (
      nextResourceProgressMap: Record<string, ResourceProgressState>,
      primaryFallback?: LessonProgressState | null
    ) => {
      if (lessonAssetRows.length === 0) {
        return;
      }

      const assetProgressEntries = lessonAssetRows.map((asset, index) =>
        getAssetProgressState(
          currentLesson.id,
          asset,
          nextResourceProgressMap,
          index === 0 ? primaryFallback ?? currentLessonProgress : null
        )
      );
      const progressPercent = Math.round(
        assetProgressEntries.reduce((sum, entry) => sum + entry.progressPercent, 0) /
          assetProgressEntries.length
      );
      const isCompleted = assetProgressEntries.every((entry) => entry.isCompleted);

      setLessonProgressMap((prev) => ({
        ...prev,
        [currentLesson.id]: normalizeLessonProgressEntry({
          ...prev[currentLesson.id],
          contentType: assetProgressEntries[0]?.contentType ?? prev[currentLesson.id]?.contentType ?? null,
          progressPercent: isCompleted ? 100 : progressPercent,
          isCompleted,
          completedAt: isCompleted ? new Date().toISOString() : null,
          lastPosition: null,
          lastPage: null,
          watchedSeconds: 0,
          lastPdfPage: null,
        }),
      }));
    },
    [currentLesson.id, currentLessonProgress, lessonAssetRows]
  );

  const persistProgress = useCallback(
    (
      payload: {
        resetProgress?: boolean;
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

        if (!options?.keepalive) {
          markProgressSaved();
        }
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
      canPersistProgress,
      currentContentType,
      currentLesson.id,
      markProgressSaved,
      markProgressSyncError,
    ]
  );

  const persistAssetProgress = useCallback(
    async (
      asset: ResolvedLessonAsset,
      payload: {
        progressPercent?: number;
        lastPosition?: number | null;
        lastPage?: number | null;
        isCompleted?: boolean;
      },
      options?: { force?: boolean; keepalive?: boolean }
    ) => {
      if (!viewerId || !hasFullCourseAccess) {
        return;
      }

      const body = {
        lessonId: currentLesson.id,
        assetId: asset.id.startsWith("legacy-") ? null : asset.id,
        contentType: asset.kind === "audio" ? "audio" : asset.kind === "pdf" ? "pdf" : "video",
        ...payload,
      };
      const signature = JSON.stringify(body);
      const persistKey = getResourceProgressKey(currentLesson.id, asset.id);

      if (!options?.force && lastAssetPersistedPayloadRef.current[persistKey] === signature) {
        return;
      }

      const runSave = async () => {
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
          throw new Error(`Failed to save resource progress (${response.status}).`);
        }

        lastAssetPersistedPayloadRef.current[persistKey] = signature;
      };

      if (options?.keepalive) {
        lastAssetPersistedPayloadRef.current[persistKey] = signature;
        void runSave().catch(() => undefined);
        return;
      }

      assetProgressSaveQueueRef.current = assetProgressSaveQueueRef.current.then(runSave, runSave).catch((error) => {
        console.error("[lesson-player] Failed to save resource progress.", error);
      });
    },
    [currentLesson.id, hasFullCourseAccess, viewerId]
  );

  useEffect(() => {
    const imageAsset =
      activeResourceAsset?.kind === "image"
        ? activeResourceAsset
        : !activeResourceAsset && primaryLessonAsset?.kind === "image"
          ? primaryLessonAsset
          : null;

    if (!imageAsset) {
      return;
    }

    updateResourceProgress(imageAsset.id, {
      kind: "image",
      isCompleted: true,
      progressPercent: 100,
    });
    void persistAssetProgress(imageAsset, {
      progressPercent: 100,
      isCompleted: true,
    });
  }, [activeResourceAsset, persistAssetProgress, primaryLessonAsset, updateResourceProgress]);

  const flushProgressBeforeUnload = useCallback(() => {
    if (!canPersistProgress || !currentContentType) {
      return;
    }

    clearPdfSaveTimeout();

    if (
      activeResourceAsset &&
      (activeResourceAsset.kind === "video" || activeResourceAsset.kind === "audio")
    ) {
      const snapshot = latestActiveResourceMediaSnapshotRef.current;
      const currentTime = Math.max(0, Math.round(snapshot?.currentTime ?? 0));
      const isCompleted =
        (snapshot?.duration ?? 0) > 0 &&
        currentTime >= Math.max(Math.round((snapshot?.duration ?? 0)) - 1, 0);

      void persistAssetProgress(
        activeResourceAsset,
        {
          progressPercent: isCompleted ? 100 : snapshot?.progressPercent ?? 0,
          lastPosition: isCompleted ? null : currentTime,
          isCompleted,
        },
        { force: true, keepalive: true }
      );
    }

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
        progressPercent: isCompleted ? 100 : Math.max(current.progressPercent, percent),
        lastPosition: isCompleted ? null : Math.max(current.lastPosition ?? 0, currentTime),
        watchedSeconds: isCompleted ? 0 : Math.max(current.lastPosition ?? 0, currentTime),
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
        lastMediaSavedCheckpointRef.current = Math.max(lastMediaSavedCheckpointRef.current, currentTime);
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
        lastMediaSavedCheckpointRef.current = Math.max(lastMediaSavedCheckpointRef.current, currentTime);
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
      activeResourceAsset,
      persistAssetProgress,
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

  const setLessonCompletionState = useCallback(
    async (nextCompletionState: "COMPLETE" | "INCOMPLETE", options?: { showToast?: boolean }) => {
      if (!hasFullCourseAccess || !viewerId) {
        return false;
      }

      const isCurrentlyCompleted = currentLessonProgress.isCompleted;
      const shouldChangeState =
        (nextCompletionState === "COMPLETE" && !isCurrentlyCompleted) ||
        (nextCompletionState === "INCOMPLETE" && isCurrentlyCompleted);

      if (!shouldChangeState) {
        return true;
      }

      setManualCompletionPending(true);

      if (nextCompletionState === "INCOMPLETE") {
        lastPersistedPayloadRef.current = "";
        lastMediaSavedCheckpointRef.current = 0;
        latestMediaSnapshotRef.current = null;
        latestPdfSnapshotRef.current = {
          page: 1,
          totalPages: latestPdfSnapshotRef.current.totalPages,
        };
        autoCompletedPdfLessonRef.current = null;
        updateCurrentLessonProgress({
          isCompleted: false,
          progressPercent: 0,
          lastPosition: null,
          lastPage: null,
          lastPdfPage: null,
          watchedSeconds: 0,
          completedAt: null,
        });
      }

      try {
        const response = await fetch(`/api/learn/lessons/${currentLesson.id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manualCompletionState: nextCompletionState,
            progressPercent: nextCompletionState === "COMPLETE" ? 100 : 0,
            lastPdfPage:
              currentContentType === "pdf"
                ? Math.max(
                    1,
                    latestPdfSnapshotRef.current.page || currentLessonProgress.lastPage || 1
                  )
                : undefined,
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
          if (nextCompletionState === "INCOMPLETE") {
            lastPersistedPayloadRef.current = "";
            lastMediaSavedCheckpointRef.current = 0;
          }
        }

        if (nextCompletionState === "COMPLETE") {
          setResumePrompt(null);
          autoCompletedPdfLessonRef.current = currentLesson.id;
          if (options?.showToast) {
            toast("Lesson complete — well done!", "success");
          }
        }

        markProgressSaved();
        return true;
      } catch (error) {
        console.error("[lesson-player] Failed to toggle lesson completion.", error);
        markProgressSyncError();

        if (nextCompletionState === "INCOMPLETE") {
          updateCurrentLessonProgress({
            isCompleted: true,
            progressPercent: 100,
            completedAt: new Date().toISOString(),
          });
        }

        return false;
      } finally {
        setManualCompletionPending(false);
      }
    },
    [
      applyServerCourseProgress,
      currentContentType,
      currentLesson.id,
      currentLessonProgress.isCompleted,
      currentLessonProgress.lastPage,
      hasFullCourseAccess,
      markProgressSaved,
      markProgressSyncError,
      toast,
      updateCurrentLessonProgress,
      viewerId,
    ]
  );

  const handlePdfProgress = useCallback(
    (percent: number, currentPage: number, totalPages: number) => {
      latestPdfSnapshotRef.current = {
        page: currentPage,
        totalPages,
      };

      // Only mark as complete automatically if we actually have page count data
      // and the user has reached the final page.
      const isCompleted = totalPages > 1 && currentPage >= totalPages;

      updateCurrentLessonProgress((current) => ({
        ...current,
        contentType: "pdf",
        progressPercent: isCompleted ? 100 : Math.max(current.progressPercent, percent),
        lastPage: Math.max(current.lastPage ?? 1, currentPage),
        lastPdfPage: Math.max(current.lastPdfPage ?? 1, currentPage),
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
        if (
          hasFullCourseAccess &&
          viewerId &&
          !currentLessonProgress.isCompleted &&
          autoCompletedPdfLessonRef.current !== currentLesson.id
        ) {
          void setLessonCompletionState("COMPLETE", { showToast: true });
        }
      }
    },
    [
      autoCompletedPdfLessonRef,
      canPersistProgress,
      clearPdfSaveTimeout,
      currentLesson.id,
      currentLessonProgress.isCompleted,
      hasFullCourseAccess,
      persistProgress,
      setLessonCompletionState,
      updateCurrentLessonProgress,
      viewerId,
    ]
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
        lastPersistedPayloadRef.current = "";
        persistProgress(
          {
            resetProgress: true,
            progressPercent: 0,
            lastPosition: 0,
            isCompleted: false,
          },
          { force: true }
        );
      }
    } else {
      setPdfInitialPage(1);
      setPdfScrollRequest({
        page: 1,
        nonce: ++pdfScrollNonceRef.current,
        behavior: "smooth",
      });
      updateCurrentLessonProgress((current) => ({
        ...current,
        progressPercent: 0,
        lastPage: 1,
        lastPdfPage: 1,
        isCompleted: false,
        completedAt: null,
      }));
      latestPdfSnapshotRef.current.page = 1;

      if (canPersistProgress) {
        lastPersistedPayloadRef.current = "";
        persistProgress(
          {
            resetProgress: true,
            progressPercent: 0,
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
    const nextCompletionState = currentLessonProgress.isCompleted ? "INCOMPLETE" : "COMPLETE";
    await setLessonCompletionState(nextCompletionState);
  }, [currentLessonProgress.isCompleted, setLessonCompletionState]);

  const toggleCurrentAssetCompletion = useCallback(async () => {
    if (!activeViewerAsset || !viewerId || !hasFullCourseAccess || activeViewerAsset.kind === "file") {
      return;
    }

    const nextIsCompleted = !currentAssetProgress.isCompleted;
    const assetKey = getResourceProgressKey(currentLesson.id, activeViewerAsset.id);
    const nextResourceProgressState: ResourceProgressState = {
      isCompleted: nextIsCompleted,
      kind: activeViewerAsset.kind === "pdf" ? "pdf" : activeViewerAsset.kind === "image" ? "image" : "media",
      lastPage:
        activeViewerAsset.kind === "pdf"
          ? nextIsCompleted
            ? currentAssetProgress.lastPage ?? 1
            : undefined
          : undefined,
      lastPosition:
        activeViewerAsset.kind === "video" || activeViewerAsset.kind === "audio"
          ? nextIsCompleted
            ? undefined
            : 0
          : undefined,
      progressPercent: nextIsCompleted ? 100 : 0,
      updatedAt: Date.now(),
    };

    try {
      const response = await fetch("/api/progress", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId: currentLesson.id,
          assetId: activeViewerAsset.id.startsWith("legacy-") ? null : activeViewerAsset.id,
          contentType:
            activeViewerAsset.kind === "audio"
              ? "audio"
              : activeViewerAsset.kind === "pdf"
                ? "pdf"
                : activeViewerAsset.kind === "image"
                  ? "image"
                  : "video",
          isCompleted: nextIsCompleted,
          resetProgress: !nextIsCompleted,
          progressPercent: nextIsCompleted ? 100 : 0,
          lastPosition:
            activeViewerAsset.kind === "video" || activeViewerAsset.kind === "audio"
              ? nextIsCompleted
                ? null
                : 0
              : undefined,
          lastPage:
            activeViewerAsset.kind === "pdf"
              ? nextIsCompleted
                ? currentAssetProgress.lastPage ?? 1
                : 1
              : undefined,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to update asset progress (${response.status}).`);
      }

      const payload = (await response.json()) as {
        courseProgress?: {
          completedLessonIds?: string[];
          lessonProgressByLessonId?: Record<string, Partial<LessonProgressState>>;
        };
      };

      const nextResourceProgressMap = {
        ...resourceProgressMap,
        [assetKey]: nextResourceProgressState,
      };

      setResourceProgressMap(nextResourceProgressMap);
      updateCurrentLessonFromAssetProgress(
        nextResourceProgressMap,
        !activeResourceAsset ? resourceProgressToLessonProgressState(nextResourceProgressState) : undefined
      );
      applyServerCourseProgress(payload.courseProgress);

      if (!nextIsCompleted) {
        if (activeResourceAsset) {
          setResourceResumePrompt(null);
          setActiveResourceStartTime(0);
          setActiveResourceInitialPage(1);
        } else {
          setResumePrompt(null);
          setMediaStartTime(0);
          setPdfInitialPage(1);
        }
      }

      markProgressSaved();
    } catch (error) {
      console.error("[lesson-player] Failed to toggle asset completion.", error);
      markProgressSyncError();
      toast("We couldn't update this asset right now.", "error");
    }
  }, [
    activeResourceAsset,
    activeViewerAsset,
    applyServerCourseProgress,
    currentAssetProgress,
    currentLesson.id,
    hasFullCourseAccess,
    markProgressSaved,
    markProgressSyncError,
    resourceProgressMap,
    toast,
    updateCurrentLessonFromAssetProgress,
    viewerId,
  ]);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === "undefined") {
      return;
    }

    const storedSidebarState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (storedSidebarState === "true" || storedSidebarState === "false") {
      setSidebarOpen(storedSidebarState === "true");
      return;
    }

    setSidebarOpen(window.innerWidth >= DESKTOP_BREAKPOINT);
  }, []);

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
  }, [isMounted, sidebarOpen]);

  useEffect(() => {
    return () => {
      clearProgressFeedbackTimeout();
      clearPdfSaveTimeout();
    };
  }, [clearPdfSaveTimeout, clearProgressFeedbackTimeout]);

  useEffect(() => {
    if (!isMediaFullscreen) {
      return;
    }

    setSidebarOpen(false);
  }, [isMediaFullscreen]);

  useEffect(() => {
    const initialProgress = normalizeLessonProgressEntry(initialLessonProgressMap[currentLesson.id]);
    autoCompletedPdfLessonRef.current = initialProgress.isCompleted ? currentLesson.id : null;
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
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          progress?: Partial<LessonProgressState> | null;
          allProgress?: Array<
            Partial<LessonProgressState> & {
              assetId?: string | null;
              contentType?: "video" | "audio" | "pdf" | null;
            }
          >;
        };
        if (cancelled) {
          return;
        }

        if (data.progress) {
          const normalized = normalizeLessonProgressEntry(data.progress);
          setLessonProgressMap((prev) => ({
            ...prev,
            [currentLesson.id]: normalized,
          }));
        }

        const allProgress = Array.isArray(data.allProgress) ? data.allProgress : null;

        if (!allProgress) {
          return;
        }

        setResourceProgressMap((prev) => {
          const next = { ...prev };

          allProgress.forEach((entry) => {
            if (!entry.assetId) {
              return;
            }

            const kind =
              entry.contentType === "pdf"
                ? "pdf"
                : entry.contentType === "audio" || entry.contentType === "video"
                  ? "media"
                  : null;

            if (!kind) {
              return;
            }

            next[getResourceProgressKey(currentLesson.id, entry.assetId)] = {
              kind,
              isCompleted: Boolean(entry.isCompleted),
              lastPage: entry.lastPage ?? undefined,
              lastPosition: entry.lastPosition ?? undefined,
              progressPercent: clampPercentage(entry.progressPercent ?? 0),
              updatedAt: Date.now(),
            };
          });

          return next;
        });
      } catch (error) {
        console.error("[lesson-player] Failed to load saved lesson progress.", error);
      }
    };

    void loadSavedProgress();

    return () => {
      cancelled = true;
    };
  }, [canPersistProgress, currentLesson.id, isMounted]);

  useEffect(() => {
    const selectedAsset = activeViewerAsset;

    if (
      !isMounted ||
      !canPersistProgress ||
      !selectedAsset ||
      selectedAsset.id.startsWith("legacy-") ||
      selectedAsset.kind === "file" ||
      selectedAsset.kind === "image"
    ) {
      selectedAssetProgressFetchKeyRef.current = null;
      return;
    }

    const assetKey = `${currentLesson.id}:${selectedAsset.id}`;

    if (selectedAssetProgressFetchKeyRef.current === assetKey) {
      return;
    }

    selectedAssetProgressFetchKeyRef.current = assetKey;
    const controller = new AbortController();

    const applySelectedAssetProgress = (progress: LessonProgressState) => {
      setResourceProgressMap((prev) => ({
        ...prev,
        [getResourceProgressKey(currentLesson.id, selectedAsset.id)]: {
          isCompleted: progress.isCompleted,
          kind: selectedAsset.kind === "pdf" ? "pdf" : "media",
          lastPage: progress.lastPage ?? undefined,
          lastPosition: progress.lastPosition ?? undefined,
          progressPercent: progress.progressPercent,
          updatedAt: Date.now(),
        },
      }));

      if (activeResourceAsset) {
        if (progress.isCompleted) {
          setResourceResumePrompt(null);
          setActiveResourceInitialPage(progress.lastPage ?? 1);
          setActiveResourceStartTime(progress.lastPosition ?? 0);
          return;
        }

        if (selectedAsset.kind === "pdf") {
          if ((progress.lastPage ?? 1) > 1) {
            setActiveResourceInitialPage(1);
            setResourceResumePrompt({ kind: "pdf", page: progress.lastPage ?? 1 });
          } else {
            setActiveResourceInitialPage(progress.lastPage ?? 1);
            setResourceResumePrompt(null);
          }
          return;
        }

        if ((progress.lastPosition ?? 0) > 10) {
          setActiveResourceStartTime(0);
          setResourceResumePrompt({ kind: "media", position: progress.lastPosition ?? 0 });
        } else {
          setActiveResourceStartTime(progress.lastPosition ?? 0);
          setResourceResumePrompt(null);
        }
        return;
      }

      if (progress.isCompleted) {
        setResumePrompt(null);
        setPdfInitialPage(progress.lastPage ?? 1);
        setMediaStartTime(progress.lastPosition ?? 0);
        return;
      }

      if (selectedAsset.kind === "pdf") {
        if ((progress.lastPage ?? 1) > 1) {
          setPdfInitialPage(1);
          setResumePrompt({ kind: "pdf", page: progress.lastPage ?? 1 });
        } else {
          setPdfInitialPage(progress.lastPage ?? 1);
          setResumePrompt(null);
        }
        return;
      }

      if ((progress.lastPosition ?? 0) > 10) {
        setMediaStartTime(0);
        setResumePrompt({ kind: "media", position: progress.lastPosition ?? 0 });
      } else {
        setMediaStartTime(progress.lastPosition ?? 0);
        setResumePrompt(null);
      }
    };

    void fetch(
      `/api/progress?lessonId=${encodeURIComponent(currentLesson.id)}&assetId=${encodeURIComponent(
        selectedAsset.id
      )}`,
      {
        cache: "no-store",
        signal: controller.signal,
      }
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load selected asset progress (${response.status}).`);
        }

        return (await response.json()) as {
          progress?: Partial<LessonProgressState> | null;
        };
      })
      .then((payload) => {
        if (controller.signal.aborted || !payload.progress) {
          return;
        }

        applySelectedAssetProgress(normalizeLessonProgressEntry(payload.progress));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("[lesson-player] Failed to load selected asset progress.", error);
      });

    return () => controller.abort();
  }, [
    activeResourceAsset,
    activeViewerAsset,
    canPersistProgress,
    currentLesson.id,
    isMounted,
  ]);

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

          {progressSyncState === "saved" || progressSyncState === "error" ? (
            <div className="rounded-xl p-3">
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

      <div className="relative flex flex-1 overflow-hidden">
        <button
          onClick={() => setSidebarOpen((current) => !current)}
          className={cn(
            "absolute top-6 z-30 hidden h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-950/85 text-slate-300 shadow-xl backdrop-blur-sm transition-all hover:border-primary-blue/40 hover:text-white lg:flex",
            sidebarOpen ? "left-[18.75rem]" : "left-4"
          )}
          title={sidebarOpen ? "Collapse curriculum" : "Expand curriculum"}
        >
          {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>

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
                          const isCurrentLesson = lesson.id === pendingLessonId;
                          const isUnlocked = isLessonUnlocked(lesson);
                          const lessonProgress = normalizeLessonProgressEntry(lessonProgressMap[lesson.id]);
                          const isCompleted = lessonProgress.isCompleted || lessonProgress.progressPercent === 100;
                          const LessonIcon = getLessonSidebarIcon(lesson);
                          const lessonAssetsForSidebar = resolveLessonAssets(
                            lesson.id === currentLesson.id ? lessonForRendering : lesson
                          );

                          return (
                            <div key={lesson.id}>
                              <button
                                type="button"
                                disabled={!isUnlocked}
                                onClick={() => handleLessonSelect(lesson.id)}
                                className={cn(
                                  "group block w-full rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all duration-200",
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
                              </button>

                              {lessonAssetsForSidebar.length > 0 ? (
                                <div className="ml-6 mt-2 space-y-1.5 border-l border-white/10 pl-3">
                                  {lessonAssetsForSidebar.map((asset, assetIndex) => {
                                    const progress =
                                      lesson.id === currentLesson.id
                                        ? getAssetProgressState(
                                            lesson.id,
                                            asset,
                                            resourceProgressMap,
                                            assetIndex === 0 ? currentLessonProgress : null
                                          )
                                        : resourceProgressMap[getResourceProgressKey(lesson.id, asset.id)];
                                    const isActiveResource =
                                      lesson.id === currentLesson.id &&
                                      ((activeResourceId === asset.id) ||
                                        (!activeResourceId && asset.id === primaryLessonAsset?.id));
                                    const resourceBadge = getLessonResourceBadge(asset);

                                    return (
                                      <button
                                        key={asset.id}
                                        type="button"
                                        disabled={!isUnlocked || asset.kind === "file"}
                                        onClick={() => handleLessonSelect(lesson.id, assetIndex === 0 ? null : asset.id)}
                                        className={cn(
                                          "w-full rounded-lg border px-3 py-2 text-left",
                                          isActiveResource
                                            ? "border-primary-blue/40 bg-primary-blue/12"
                                            : "border-white/5 bg-white/[0.03]",
                                          (!isUnlocked || asset.kind === "file") && "cursor-not-allowed opacity-70"
                                        )}
                                      >
                                        <div className="flex items-center gap-2">
                                          {asset.kind === "video" ? (
                                            <PlayCircle className="h-3.5 w-3.5 shrink-0 text-primary-blue" />
                                          ) : asset.kind === "audio" ? (
                                            <Volume2 className="h-3.5 w-3.5 shrink-0 text-primary-blue" />
                                          ) : (
                                            <FileText className="h-3.5 w-3.5 shrink-0 text-primary-blue" />
                                          )}
                                          <span className="truncate text-[11px] font-semibold text-white">
                                            {asset.displayTitle}
                                          </span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                          <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                                            {resourceBadge}
                                          </span>
                                          {progress?.isCompleted ? (
                                            <span className="text-[10px] font-semibold text-emerald-300">
                                              Done
                                            </span>
                                          ) : progress?.progressPercent ? (
                                            <span className="text-[10px] font-semibold text-primary-blue">
                                              {progress.progressPercent}%
                                            </span>
                                          ) : null}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
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
                <div className="mt-4 space-y-3">
                  <button
                    onClick={toggleLessonCompletion}
                    disabled={
                      manualCompletionPending ||
                      (!currentLessonAssetsCompleted && !currentLessonProgress.isCompleted)
                    }
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
                      currentLessonProgress.isCompleted
                        ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        : "bg-primary-blue text-white shadow-lg shadow-primary-blue/30 hover:bg-primary-blue/90"
                    )}
                  >
                    {manualCompletionPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {currentLessonProgress.isCompleted
                      ? "Mark as Incomplete"
                      : currentLessonAssetsCompleted
                        ? "Mark as Complete"
                        : "View all assets to complete"}
                  </button>

                  <div className="grid grid-cols-1 gap-2">
                    {currentIndex > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleLessonSelect(allLessons[currentIndex - 1].id)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all duration-200 hover:bg-white/10 hover:text-white"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous Lesson
                      </button>
                    ) : null}
                    {currentIndex < allLessons.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => handleLessonSelect(allLessons[currentIndex + 1].id)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-blue/30 transition-all duration-200 hover:bg-primary-blue/90"
                      >
                        Next Lesson
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
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
                <motion.div
                  className="relative"
                  initial={false}
                  animate={{ opacity: isLessonNavigating ? 0.45 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {isLessonNavigating ? (
                    <div className="absolute inset-0 z-20 flex min-h-[400px] w-full animate-pulse flex-col gap-4 rounded-2xl border border-white/10 bg-[#08101d]/88 p-6 backdrop-blur-sm">
                      <div className="h-8 w-40 rounded-xl bg-white/10" />
                      <div className="h-64 rounded-2xl bg-white/8" />
                      <div className="h-4 w-3/4 rounded bg-white/10" />
                      <div className="h-4 w-1/2 rounded bg-white/10" />
                    </div>
                  ) : null}
                  {mainImageAssets.length > 0 ? (
                    <div className="w-full space-y-4 overflow-hidden rounded-2xl">
                      {mainImageAssets.map((asset) => (
                        <img
                          key={asset.id}
                          src={asset.resolvedUrl}
                          alt={asset.title || currentLesson.title}
                          className="w-full rounded-2xl object-contain max-h-[700px]"
                        />
                      ))}
                    </div>
                  ) : null}

                  {shouldShowPlayerSkeleton ? (
                    <div className="flex min-h-[400px] w-full animate-pulse flex-col justify-center gap-4 rounded-2xl border border-white/10 bg-[#08101d]/92 p-6 shadow-2xl">
                      <div className="h-8 w-44 rounded-xl bg-white/10" />
                      <div className="h-64 rounded-2xl bg-white/8" />
                      <div className="h-4 w-2/3 rounded bg-white/10" />
                    </div>
                  ) : null}

                  {activeViewerKind === "pdf" && activeViewerUrl ? (
                    <div
                      ref={pdfViewportRef}
                      className="min-h-[500px] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white to-slate-100 shadow-2xl"
                    >
                      <LessonPdfViewer
                        file={activeViewerUrl}
                        lessonId={activeViewerAsset?.id ?? currentLesson.id}
                        viewportWidth={pdfViewportWidth || pdfViewportRef.current?.clientWidth || 800}
                        onProgress={
                          activeResourceAsset ? handleActiveResourcePdfProgress : handlePdfProgress
                        }
                        onLoad={handlePdfLoad}
                        initialPage={activeResourceAsset ? activeResourceInitialPage : pdfInitialPage}
                        maxPages={previewPagesLimit}
                        scrollRequest={activeResourceAsset ? null : pdfScrollRequest}
                      />
                    </div>
                  ) : null}

                  {activeViewerKind === "video" && activeViewerUrl ? (
                    <div className="mx-auto w-full max-w-4xl">
                      <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl" style={{ aspectRatio: "16/9" }}>
                        <MediaPlayer
                          ref={mediaPlayerRef}
                          src={activeViewerUrl}
                          type="video"
                          initialTime={activeResourceAsset ? activeResourceStartTime : mediaStartTime}
                          maxDuration={previewMinutesLimitSeconds || undefined}
                          isLocked={isPreviewOnlyLesson && previewMinutesLimitSeconds > 0}
                          onLoadedMetadata={(duration) => setMediaDuration(duration)}
                          onTimeUpdate={
                            activeResourceAsset ? handleActiveResourceMediaProgress : handleMediaProgress
                          }
                          onPause={
                            activeResourceAsset ? handleActiveResourceMediaPause : handleMediaPause
                          }
                          onEnded={
                            activeResourceAsset ? handleActiveResourceMediaEnded : handleMediaEnded
                          }
                          onFullscreenChange={setIsMediaFullscreen}
                          fullscreenActions={
                            <>
                              {askAiEnabled ? (
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setAskAiOpen((current) => !current);
                                  }}
                                  className={cn(
                                    fullscreenActionButtonClass,
                                    askAiOpen && "border-primary-blue/50 bg-primary-blue/25 text-primary-blue"
                                  )}
                                  title="Ask AI"
                                >
                                  <Sparkles className="h-5 w-5" />
                                </button>
                              ) : null}
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setNotesPanelOpen((current) => !current);
                                }}
                                className={cn(
                                  fullscreenActionButtonClass,
                                  notesPanelOpen && "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                                )}
                                title="Notes"
                              >
                                <NotebookText className="h-5 w-5" />
                              </button>
                            </>
                          }
                          fullscreenOverlay={
                            askAiOpen || notesPanelOpen ? (
                              <div className="flex h-full flex-col justify-start gap-4 pt-14">
                                {askAiEnabled && askAiOpen ? (
                                  <div className="min-h-0 flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-md">
                                    <AskAI
                                      courseTitle={course.title}
                                      onClose={() => setAskAiOpen(false)}
                                      assistantLabel={askAiAssistantLabel}
                                      variant="embedded"
                                      className="h-full"
                                    />
                                  </div>
                                ) : null}
                                {notesPanelOpen ? (
                                  <div className="h-[min(34rem,55vh)] overflow-hidden rounded-[30px] border border-white/10 bg-[#04070d]/95 shadow-2xl backdrop-blur-md">
                                    <LessonNotesPanel
                                      lessonId={currentLesson.id}
                                      viewerId={viewerId}
                                      initialContent={noteContent}
                                      isOpen={notesPanelOpen}
                                      onClose={() => setNotesPanelOpen(false)}
                                      onContentChange={setNoteContent}
                                      variant="embedded"
                                      className="h-full border-0 shadow-none"
                                    />
                                  </div>
                                ) : null}
                              </div>
                            ) : null
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  {activeViewerKind === "audio" && activeViewerUrl ? (
                    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl" style={{ minHeight: 340 }}>
                      <MediaPlayer
                        ref={mediaPlayerRef}
                        src={activeViewerUrl}
                        type="audio"
                        initialTime={activeResourceAsset ? activeResourceStartTime : mediaStartTime}
                        maxDuration={previewMinutesLimitSeconds || undefined}
                        isLocked={isPreviewOnlyLesson && previewMinutesLimitSeconds > 0}
                        onLoadedMetadata={(duration) => setMediaDuration(duration)}
                        onTimeUpdate={
                          activeResourceAsset ? handleActiveResourceMediaProgress : handleMediaProgress
                        }
                        onPause={
                          activeResourceAsset ? handleActiveResourceMediaPause : handleMediaPause
                        }
                        onEnded={
                          activeResourceAsset ? handleActiveResourceMediaEnded : handleMediaEnded
                        }
                      />
                    </div>
                  ) : null}

                  {!shouldShowPlayerSkeleton && !activeViewerKind && mainImageAssets.length === 0 ? (
                    <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl">
                      <AlertCircle className="h-12 w-12 text-rose-400" />
                      <div className="max-w-md text-center">
                        <h3 className="mb-2 text-lg font-bold text-white">
                          {activeResourceAsset?.kind === "file"
                            ? "Resource unavailable in classroom"
                            : resolvedLessonRenderer.fallbackTitle}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {activeResourceAsset?.kind === "file"
                            ? "This file type is not viewable inside the classroom yet."
                            : resolvedLessonRenderer.fallbackMessage}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <AnimatePresence>
                    <ResumeOverlay
                      prompt={activeResourceAsset ? resourceResumePrompt : resumePrompt}
                      onResume={
                        activeResourceAsset
                          ? handleResourceResumePromptResume
                          : handleResumePromptResume
                      }
                      onStartOver={
                        activeResourceAsset
                          ? handleResourceResumePromptStartOver
                          : handleResumePromptStartOver
                      }
                    />
                  </AnimatePresence>
                </motion.div>

                {activeViewerAsset && activeViewerAsset.kind !== "file" ? (
                  <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#08101d]/88 p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-white">
                          {activeViewerAsset.displayTitle || currentLesson.title}
                        </h2>
                        {currentAssetProgress.isCompleted ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                            Completed
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Track this asset separately from the rest of the lesson.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={toggleCurrentAssetCompletion}
                      disabled={!viewerId || !hasFullCourseAccess}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
                        currentAssetProgress.isCompleted
                          ? "border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                          : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500/90"
                      )}
                    >
                      {currentAssetProgress.isCompleted ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {currentAssetProgress.isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
                    </button>
                  </div>
                ) : null}

                {activeResourceAsset ? (
                  <div className="hidden mt-5 rounded-2xl border border-white/10 bg-[#08101d]/90 p-4 shadow-xl">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">Lesson Resources</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Resources are listed in the sidebar under this lesson and keep their own saved position.
                        </p>
                      </div>
                      <div className="text-xs text-slate-500">
                        {lessonAssetRows.length} resource{lessonAssetRows.length === 1 ? "" : "s"}
                      </div>
                    </div>

                    <div className="hidden">
                      {lessonAssetRows.map((asset) => {
                        const assetBadge = getLessonResourceBadge(asset);

                        return (
                          <div
                            key={asset.id}
                            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
                                {asset.kind === "video" ? (
                                  <PlayCircle className="h-4 w-4" />
                                ) : asset.kind === "audio" ? (
                                  <Volume2 className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-white">
                                  {asset.displayTitle}
                                </p>
                                <span className="rounded-full border border-primary-blue/25 bg-primary-blue/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-blue">
                                  {assetBadge}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs text-slate-400">
                                {asset.fileName || asset.displayTitle}
                              </p>
                            </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {asset.kind === "video" ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveResourceId(asset.id)}
                                  className="inline-flex items-center justify-center rounded-xl bg-primary-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-blue/90"
                                >
                                  ▶ Watch
                                </button>
                              ) : asset.kind === "audio" ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveResourceId(asset.id)}
                                  className="inline-flex items-center justify-center rounded-xl bg-primary-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-blue/90"
                                >
                                  Listen
                                </button>
                              ) : asset.kind === "pdf" ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveResourceId(asset.id)}
                                  className="inline-flex items-center justify-center rounded-xl bg-primary-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-blue/90"
                                >
                                  📄 View
                                </button>
                              ) : (
                                <a
                                  href={asset.resolvedUrl}
                                  download
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                                >
                                  <Download className="h-4 w-4" />
                                  Download
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{activeResourceAsset.displayTitle}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {activeResourceAsset.kind === "pdf"
                                ? "Viewing supporting PDF"
                                : activeResourceAsset.kind === "audio"
                                  ? "Listening to supporting audio"
                                  : "Watching supporting video"}
                            </p>
                            {activeResourceProgress?.progressPercent ? (
                              <p className="mt-1 text-[11px] font-semibold text-primary-blue">
                                Saved progress: {activeResourceProgress.progressPercent}%
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveResourceId(null)}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                          >
                            Close
                          </button>
                        </div>

                        {activeResourceAsset.kind === "pdf" && activeResourcePdfUrl ? (
                          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white">
                            <LessonPdfViewer
                              file={activeResourcePdfUrl}
                              lessonId={`${currentLesson.id}-${activeResourceAsset.id}`}
                              viewportWidth={pdfViewportWidth || pdfViewportRef.current?.clientWidth || 800}
                              onProgress={handleActiveResourcePdfProgress}
                              initialPage={activeResourceInitialPage}
                              maxPages={previewPagesLimit}
                            />
                            <AnimatePresence>
                              <ResumeOverlay
                                prompt={resourceResumePrompt}
                                onResume={handleResourceResumePromptResume}
                                onStartOver={handleResourceResumePromptStartOver}
                              />
                            </AnimatePresence>
                          </div>
                        ) : null}

                        {activeResourceAsset.kind === "video" ? (
                          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
                            <MediaPlayer
                              src={activeResourceAsset.resolvedUrl}
                          type="video"
                          initialTime={activeResourceStartTime}
                          maxDuration={previewMinutesLimitSeconds || undefined}
                          isLocked={isPreviewOnlyLesson && previewMinutesLimitSeconds > 0}
                          onTimeUpdate={handleActiveResourceMediaProgress}
                          onPause={handleActiveResourceMediaPause}
                          onEnded={handleActiveResourceMediaEnded}
                        />
                            <AnimatePresence>
                              <ResumeOverlay
                                prompt={resourceResumePrompt}
                                onResume={handleResourceResumePromptResume}
                                onStartOver={handleResourceResumePromptStartOver}
                              />
                            </AnimatePresence>
                          </div>
                        ) : null}

                        {activeResourceAsset.kind === "audio" ? (
                          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950">
                            <MediaPlayer
                              src={activeResourceAsset.resolvedUrl}
                              type="audio"
                              initialTime={activeResourceStartTime}
                              maxDuration={previewMinutesLimitSeconds || undefined}
                              isLocked={isPreviewOnlyLesson && previewMinutesLimitSeconds > 0}
                              onTimeUpdate={handleActiveResourceMediaProgress}
                              onPause={handleActiveResourceMediaPause}
                              onEnded={handleActiveResourceMediaEnded}
                            />
                            <AnimatePresence>
                              <ResumeOverlay
                                prompt={resourceResumePrompt}
                                onResume={handleResourceResumePromptResume}
                                onStartOver={handleResourceResumePromptStartOver}
                              />
                            </AnimatePresence>
                          </div>
                        ) : null}
                      </div>
                  </div>
                ) : null}

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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {notesPanelOpen && !isMediaFullscreen ? (
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
        {askAiOpen && askAiEnabled && !isMediaFullscreen ? (
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
