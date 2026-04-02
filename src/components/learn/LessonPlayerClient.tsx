"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AICopilot } from "@/components/courses/AICopilot";
import { useToast } from "@/components/ui/ToastProvider";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Play,
  FileText,
  BarChart2,
  Award,
  CheckCircle2,
  Circle,
  Sparkles,
  Download,
  ThumbsUp,
  Flag,
  Volume2,
  ExternalLink,
  Loader2,
  NotebookText,
  Clock3,
  Save,
  Grip,
  Maximize2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";

type LessonPlayerNote = {
  id: string;
  content: string;
  timestamp: string;
};

type NotesPanelPosition = {
  x: number;
  y: number;
};

type NotesPanelSize = {
  width: number;
  height: number;
};

type CourseLesson = NonNullable<Course["modules"]>[number]["lessons"][number];

const savedAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const NOTES_PANEL_OPEN_KEY = "ai-learning-class:lesson-notes-panel-open";
const NOTES_PANEL_POSITION_KEY = "ai-learning-class:lesson-notes-panel-position";
const NOTES_PANEL_SIZE_KEY = "ai-learning-class:lesson-notes-panel-size";
const DESKTOP_BREAKPOINT = 1024;
const DESKTOP_PANEL_MIN_WIDTH = 340;
const DESKTOP_PANEL_MIN_HEIGHT = 320;
const DESKTOP_PANEL_DEFAULT_SIZE: NotesPanelSize = {
  width: 420,
  height: 460,
};

function formatSavedAt(value: string) {
  return savedAtFormatter.format(new Date(value));
}

function isDesktopViewport() {
  return typeof window !== "undefined" && window.innerWidth >= DESKTOP_BREAKPOINT;
}

function getDefaultPanelPosition(size: NotesPanelSize): NotesPanelPosition {
  if (typeof window === "undefined") {
    return { x: 24, y: 96 };
  }

  const margin = 24;
  return {
    x: Math.max(margin, window.innerWidth - size.width - margin),
    y: 96,
  };
}

function clampPanelPosition(position: NotesPanelPosition, size: NotesPanelSize) {
  if (typeof window === "undefined") {
    return position;
  }

  const horizontalMargin = 16;
  const topMargin = 88;
  const maxX = Math.max(horizontalMargin, window.innerWidth - size.width - horizontalMargin);
  const maxY = Math.max(topMargin, window.innerHeight - size.height - horizontalMargin);

  return {
    x: Math.min(Math.max(position.x, horizontalMargin), maxX),
    y: Math.min(Math.max(position.y, topMargin), maxY),
  };
}

function readStoredPanelSize() {
  if (typeof window === "undefined") {
    return DESKTOP_PANEL_DEFAULT_SIZE;
  }

  const rawValue = window.localStorage.getItem(NOTES_PANEL_SIZE_KEY);

  if (!rawValue) {
    return DESKTOP_PANEL_DEFAULT_SIZE;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<NotesPanelSize>;
    return {
      width: Math.max(DESKTOP_PANEL_MIN_WIDTH, Math.round(parsed.width ?? DESKTOP_PANEL_DEFAULT_SIZE.width)),
      height: Math.max(
        DESKTOP_PANEL_MIN_HEIGHT,
        Math.round(parsed.height ?? DESKTOP_PANEL_DEFAULT_SIZE.height)
      ),
    };
  } catch {
    return DESKTOP_PANEL_DEFAULT_SIZE;
  }
}

function readStoredPanelPosition(size: NotesPanelSize) {
  if (typeof window === "undefined") {
    return getDefaultPanelPosition(size);
  }

  const rawValue = window.localStorage.getItem(NOTES_PANEL_POSITION_KEY);

  if (!rawValue) {
    return getDefaultPanelPosition(size);
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<NotesPanelPosition>;
    return clampPanelPosition(
      {
        x: Math.round(parsed.x ?? getDefaultPanelPosition(size).x),
        y: Math.round(parsed.y ?? getDefaultPanelPosition(size).y),
      },
      size
    );
  } catch {
    return getDefaultPanelPosition(size);
  }
}

function readStoredPanelOpenState() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(NOTES_PANEL_OPEN_KEY) === "true";
}

export function LessonPlayerClient({
  course,
  initialLessonId,
  viewerId,
  initialCompletedLessonIds,
  initialNotes,
  initialNoteContent,
  hasFullCourseAccess,
}: {
  course: Course;
  initialLessonId: string;
  viewerId: string | null;
  initialCompletedLessonIds: string[];
  initialNotes: LessonPlayerNote[];
  initialNoteContent: string;
  hasFullCourseAccess: boolean;
}) {
  const { toast } = useToast();
  const modules = course.modules ?? [];
  const allLessons = useMemo(() => modules.flatMap((module) => module.lessons), [modules]);
  const isLessonUnlocked = useCallback(
    (lesson: CourseLesson) => hasFullCourseAccess || lesson.isPreview,
    [hasFullCourseAccess]
  );
  const currentLesson = allLessons.find((lesson) => lesson.id === initialLessonId) ?? allLessons[0];
  const currentIndex = allLessons.findIndex((lesson) => lesson.id === currentLesson.id);
  const prevLesson =
    currentIndex > 0
      ? [...allLessons.slice(0, currentIndex)].reverse().find((lesson) => isLessonUnlocked(lesson))
      : undefined;
  const nextLesson =
    currentIndex >= 0
      ? allLessons.slice(currentIndex + 1).find((lesson) => isLessonUnlocked(lesson))
      : undefined;
  const hasLockedLessonsAhead =
    !hasFullCourseAccess &&
    allLessons.slice(currentIndex + 1).some((lesson) => !isLessonUnlocked(lesson));
  const currentModule = modules.find((module) =>
    module.lessons.some((lesson) => lesson.id === currentLesson.id)
  );
  const primaryAssetUrl = currentLesson.assetUrl || currentLesson.videoUrl;
  const isPreviewOnlyLesson = currentLesson.isPreview && !hasFullCourseAccess;
  const previewMinutesLimit =
    isPreviewOnlyLesson &&
    (currentLesson.type === "VIDEO" || currentLesson.type === "AUDIO" || currentLesson.type === "LIVE")
      ? currentLesson.previewMinutes ?? undefined
      : undefined;
  const previewPagesLimit =
    isPreviewOnlyLesson && currentLesson.type === "PDF"
      ? currentLesson.previewPages ?? undefined
      : undefined;
  const resources = [
    primaryAssetUrl && currentLesson.allowDownload && hasFullCourseAccess
      ? { name: "Lesson asset", href: primaryAssetUrl, type: currentLesson.type.toLowerCase() }
      : null,
    course.previewVideoUrl
      ? { name: "Course preview", href: course.previewVideoUrl, type: "video" }
      : null,
  ].filter(Boolean) as Array<{ name: string; href: string; type: string }>;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "notes" | "resources">("overview");
  const [completedLessonIds, setCompletedLessonIds] = useState(initialCompletedLessonIds);
  const [completionPending, setCompletionPending] = useState(false);
  const [noteContent, setNoteContent] = useState(initialNoteContent);
  const [savedNoteContent, setSavedNoteContent] = useState(initialNoteContent);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [noteState, setNoteState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">(
    initialNoteContent ? "saved" : "idle"
  );
  const [notesPanelOpen, setNotesPanelOpen] = useState(readStoredPanelOpenState);
  const [isDesktopPanel, setIsDesktopPanel] = useState(isDesktopViewport);
  const [notesPanelSize, setNotesPanelSize] = useState<NotesPanelSize>(readStoredPanelSize);
  const [notesPanelPosition, setNotesPanelPosition] = useState<NotesPanelPosition>(() =>
    readStoredPanelPosition(readStoredPanelSize())
  );
  const [isDraggingNotesPanel, setIsDraggingNotesPanel] = useState(false);
  const [previewConsumedSeconds, setPreviewConsumedSeconds] = useState(0);
  const [previewLocked, setPreviewLocked] = useState(false);
  const [previewPdfPage, setPreviewPdfPage] = useState(1);
  const notesPanelRef = useRef<HTMLDivElement | null>(null);
  const notesPanelDragStateRef = useRef<{
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    setCompletedLessonIds(initialCompletedLessonIds);
  }, [initialCompletedLessonIds]);

  useEffect(() => {
    setNoteContent(initialNoteContent);
    setSavedNoteContent(initialNoteContent);
    setSavedNotes(initialNotes);
    setNoteState(initialNoteContent ? "saved" : "idle");
  }, [currentLesson.id, initialNoteContent, initialNotes]);

  useEffect(() => {
    setPreviewConsumedSeconds(0);
    setPreviewLocked(false);
    setPreviewPdfPage(1);
  }, [currentLesson.id]);

  useEffect(() => {
    if (noteState === "saving") {
      return;
    }

    if (noteContent !== savedNoteContent) {
      setNoteState("dirty");
      return;
    }

    setNoteState(savedNoteContent.trim().length > 0 ? "saved" : "idle");
  }, [noteContent, noteState, savedNoteContent]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncViewport = () => {
      const nextIsDesktop = isDesktopViewport();
      setIsDesktopPanel(nextIsDesktop);

      if (nextIsDesktop) {
        setNotesPanelPosition((current) => clampPanelPosition(current, notesPanelSize));
      }
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => window.removeEventListener("resize", syncViewport);
  }, [notesPanelSize]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(NOTES_PANEL_OPEN_KEY, String(notesPanelOpen));
  }, [notesPanelOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(NOTES_PANEL_SIZE_KEY, JSON.stringify(notesPanelSize));
  }, [notesPanelSize]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(NOTES_PANEL_POSITION_KEY, JSON.stringify(notesPanelPosition));
  }, [notesPanelPosition]);

  useEffect(() => {
    if (!notesPanelOpen || !isDesktopPanel || !notesPanelRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const panelEntry = entries[0];
      if (!panelEntry) {
        return;
      }

      const nextSize = {
        width: Math.max(DESKTOP_PANEL_MIN_WIDTH, Math.round(panelEntry.contentRect.width)),
        height: Math.max(DESKTOP_PANEL_MIN_HEIGHT, Math.round(panelEntry.contentRect.height)),
      };

      setNotesPanelSize((current) =>
        current.width === nextSize.width && current.height === nextSize.height ? current : nextSize
      );
      setNotesPanelPosition((current) => clampPanelPosition(current, nextSize));
    });

    observer.observe(notesPanelRef.current);
    return () => observer.disconnect();
  }, [isDesktopPanel, notesPanelOpen]);

  useEffect(() => {
    if (!isDraggingNotesPanel) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = notesPanelDragStateRef.current;
      if (!dragState) {
        return;
      }

      setNotesPanelPosition(
        clampPanelPosition(
          {
            x: event.clientX - dragState.offsetX,
            y: event.clientY - dragState.offsetY,
          },
          notesPanelSize
        )
      );
    };

    const handlePointerUp = () => {
      notesPanelDragStateRef.current = null;
      setIsDraggingNotesPanel(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDraggingNotesPanel, notesPanelSize]);

  useEffect(() => {
    if (!viewerId || !hasFullCourseAccess) {
      return;
    }

    // Updated: touching the lesson on open keeps resume links pointed at the learner's latest classroom location.
    void fetch(`/api/learn/lessons/${currentLesson.id}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ touchOnly: true }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.progress?.completedLessonIds) {
          return;
        }

        setCompletedLessonIds(payload.progress.completedLessonIds);
      })
      .catch(() => {});
  }, [currentLesson.id, hasFullCourseAccess, viewerId]);

  const completedLessonSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);
  const completedCount = completedLessonSet.size;
  const progress = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;
  const currentLessonCompleted = completedLessonSet.has(currentLesson.id);
  const noteHasChanges = noteContent !== savedNoteContent;
  const noteCanSave = noteContent.trim().length > 0 && noteHasChanges;
  const previewLimitSeconds = previewMinutesLimit ? previewMinutesLimit * 60 : 0;
  const hasTimedPreviewLimit = previewLimitSeconds > 0;
  const hasPdfPreviewLimit = Boolean(previewPagesLimit && previewPagesLimit > 0);
  const previewProgress = hasTimedPreviewLimit
    ? Math.min(100, Math.round((previewConsumedSeconds / previewLimitSeconds) * 100))
    : hasPdfPreviewLimit && previewPagesLimit
      ? Math.min(100, Math.round((previewPdfPage / previewPagesLimit) * 100))
      : 0;
  const pdfPreviewMaxed = Boolean(hasPdfPreviewLimit && previewPagesLimit && previewPdfPage >= previewPagesLimit);
  const previewStatusText = hasTimedPreviewLimit
    ? `${Math.min(previewMinutesLimit ?? 0, Math.max(0, Math.ceil(previewConsumedSeconds / 60)))} / ${previewMinutesLimit} minutes previewed`
    : hasPdfPreviewLimit && previewPagesLimit
      ? `${Math.min(previewPdfPage, previewPagesLimit)} / ${previewPagesLimit} preview pages unlocked`
      : null;

  const handleTimedPreviewUpdate = useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
      if (!hasTimedPreviewLimit) {
        return;
      }

      const element = event.currentTarget;
      const nextTime = Math.min(element.currentTime, previewLimitSeconds);
      setPreviewConsumedSeconds(nextTime);

      if (element.currentTime >= previewLimitSeconds) {
        element.currentTime = previewLimitSeconds;
        element.pause();
        setPreviewLocked(true);
      }
    },
    [hasTimedPreviewLimit, previewLimitSeconds]
  );

  const updateCompletedLessonIds = useCallback((lessonId: string, isCompleted: boolean) => {
    setCompletedLessonIds((current) => {
      if (isCompleted) {
        return current.includes(lessonId) ? current : [...current, lessonId];
      }

      return current.filter((entry) => entry !== lessonId);
    });
  }, []);

  const persistLessonCompletion = useCallback(
    async (isCompleted: boolean) => {
      if (!hasFullCourseAccess) {
        toast("Unlock the full course to track completion for this lesson.", "error");
        return;
      }

      if (!viewerId) {
        toast("Please sign in to track lesson progress.", "error");
        return;
      }

      const previousLessonIds = completedLessonIds;
      updateCompletedLessonIds(currentLesson.id, isCompleted);
      setCompletionPending(true);

      try {
        const response = await fetch(`/api/learn/lessons/${currentLesson.id}/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isCompleted }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Unable to update lesson progress.");
        }

        setCompletedLessonIds(payload.progress.completedLessonIds);
        toast(isCompleted ? "Lesson marked complete." : "Lesson marked incomplete.", "success");
      } catch (error) {
        setCompletedLessonIds(previousLessonIds);
        toast(
          error instanceof Error ? error.message : "Unable to update lesson progress.",
          "error"
        );
      } finally {
        setCompletionPending(false);
      }
    },
    [completedLessonIds, currentLesson.id, hasFullCourseAccess, toast, updateCompletedLessonIds, viewerId]
  );

  const saveNote = useCallback(async () => {
    if (!viewerId) {
      toast("Please sign in to save notes to your workspace.", "error");
      return false;
    }

    if (!noteContent.trim()) {
      setNoteState("error");
      toast("Add a few words before saving your notes.", "error");
      return false;
    }

    if (!noteHasChanges) {
      setNoteState(savedNoteContent ? "saved" : "idle");
      toast("Your latest notes are already saved.", "success");
      return false;
    }

    setNoteState("saving");

    try {
      const response = await fetch(`/api/learn/lessons/${currentLesson.id}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: noteContent }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save notes right now.");
      }

      setSavedNotes((current) => [payload.note, ...current]);
      setSavedNoteContent(noteContent);
      setNoteState("saved");
      toast("Notes saved to this lesson.", "success");
      return true;
    } catch (error) {
      setNoteState("error");
      toast(error instanceof Error ? error.message : "Unable to save notes right now.", "error");
      return false;
    }
  }, [currentLesson.id, noteContent, noteHasChanges, savedNoteContent, toast, viewerId]);

  const openNotesPanel = useCallback(() => {
    setNotesPanelOpen(true);
    setTab("notes");
  }, []);

  const resetNotesPanelLayout = useCallback(() => {
    setNotesPanelSize(DESKTOP_PANEL_DEFAULT_SIZE);
    setNotesPanelPosition(getDefaultPanelPosition(DESKTOP_PANEL_DEFAULT_SIZE));
  }, []);

  const beginNotesPanelDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDesktopPanel) {
        return;
      }

      const target = event.target as HTMLElement;
      if (target.closest("button")) {
        return;
      }

      notesPanelDragStateRef.current = {
        offsetX: event.clientX - notesPanelPosition.x,
        offsetY: event.clientY - notesPanelPosition.y,
      };
      setIsDraggingNotesPanel(true);
      event.preventDefault();
    },
    [isDesktopPanel, notesPanelPosition.x, notesPanelPosition.y]
  );

  const notesStatusLabel =
    noteState === "saving"
      ? "Saving notes..."
      : noteState === "saved"
        ? savedNotes[0]
          ? `Saved ${formatSavedAt(savedNotes[0].timestamp)}`
          : "Saved"
        : noteState === "error"
          ? "Save failed"
          : noteState === "dirty"
            ? "Unsaved changes"
            : "No saved notes yet";

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-white/90 px-4 backdrop-blur-xl dark:bg-slate-950/90">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-xl border border-border p-2 text-muted-foreground hover:border-primary-blue/30 hover:bg-primary-blue/10 hover:text-primary-blue"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <Link
            href={`/courses/${course.slug}`}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden max-w-[240px] truncate sm:block">{course.title}</span>
          </Link>
        </div>

        {/* Updated: course progress is driven by the learner's real completed lesson count. */}
        <div className="hidden items-center gap-3 md:flex">
          <div className="h-2 w-44 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary-blue transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-foreground">{progress}% through course</p>
            <p className="text-[11px] text-muted-foreground">
              {completedCount} / {allLessons.length} completed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotesPanelOpen((current) => !current)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
              notesPanelOpen
                ? "border-primary-blue bg-primary-blue text-white"
                : "border-primary-blue/20 bg-primary-blue/10 text-primary-blue hover:bg-primary-blue/15"
            )}
          >
            <NotebookText className="h-3.5 w-3.5" />
            <span className="hidden sm:block">{notesPanelOpen ? "Hide Notes" : "Open Notes"}</span>
          </button>

          <button
            onClick={() => setCopilotOpen(!copilotOpen)}
            className="inline-flex items-center gap-2 rounded-xl border border-primary-blue/20 bg-primary-blue/10 px-3 py-2 text-xs font-semibold text-primary-blue hover:bg-primary-blue/15"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:block">AI Copilot</span>
          </button>

          {nextLesson ? (
            <Link
              href={`/learn/${course.slug}/${nextLesson.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-blue px-3 py-2 text-xs font-semibold text-white hover:bg-primary-blue/90"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : hasLockedLessonsAhead ? (
            <Link
              href={`/courses/${course.slug}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-blue px-3 py-2 text-xs font-semibold text-white hover:bg-primary-blue/90"
            >
              Unlock Course
              <Lock className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-primary-blue/20 bg-primary-blue/10 px-3 py-2 text-xs font-semibold text-primary-blue">
              <Award className="h-3.5 w-3.5" />
              Completed
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-y-auto border-r border-border bg-card"
            >
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Course content
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {completedCount} of {allLessons.length} lessons complete
                    </p>
                  </div>
                  <Link
                    href="/dashboard#workspace-notes"
                    className="inline-flex items-center gap-1 rounded-full border border-primary-blue/20 bg-primary-blue/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-blue hover:bg-primary-blue/15"
                  >
                    <NotebookText className="h-3 w-3" />
                    My Workspace Notes
                  </Link>
                </div>

                <div className="space-y-4">
                  {modules.map((module) => (
                    <div key={module.id} className="rounded-2xl border border-border bg-background/60 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">{module.title}</span>
                      </div>
                      <div className="space-y-1.5">
                        {module.lessons.map((lesson) => {
                          const isActive = lesson.id === currentLesson.id;
                          const isCompleted = completedLessonSet.has(lesson.id);
                          const isUnlocked = isLessonUnlocked(lesson);

                          const lessonRow = (
                            <>
                              <span className="shrink-0">
                                {!isUnlocked ? (
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : isCompleted ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-primary-blue" />
                                ) : lesson.type === "QUIZ" ? (
                                  <BarChart2 className="h-3.5 w-3.5 text-primary-blue" />
                                ) : lesson.type === "PROJECT" || lesson.type === "ASSIGNMENT" ? (
                                  <Award className="h-3.5 w-3.5 text-amber-500" />
                                ) : lesson.type === "AUDIO" ? (
                                  <Volume2 className="h-3.5 w-3.5 text-primary-blue" />
                                ) : lesson.type === "PDF" || lesson.type === "TEXT" ? (
                                  <FileText className="h-3.5 w-3.5 text-primary-blue" />
                                ) : isActive ? (
                                  <Play className="h-3.5 w-3.5" />
                                ) : (
                                  <Circle className="h-3.5 w-3.5" />
                                )}
                              </span>
                              <span className="flex-1 line-clamp-1">{lesson.title}</span>
                              {lesson.isPreview && (
                                <span className="rounded-full bg-primary-blue/10 px-2 py-0.5 text-[10px] text-primary-blue">
                                  Preview
                                </span>
                              )}
                              {(lesson.duration ?? 0) > 0 && (
                                <span className="shrink-0 text-[11px]">
                                  {Math.ceil((lesson.duration ?? 0) / 60)}m
                                </span>
                              )}
                            </>
                          );

                          return isUnlocked ? (
                            <Link
                              key={lesson.id}
                              href={`/learn/${course.slug}/${lesson.id}`}
                              className={cn(
                                "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-all",
                                isActive
                                  ? "border-primary-blue/20 bg-primary-blue/10 text-primary-blue"
                                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              {lessonRow}
                            </Link>
                          ) : (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-xs text-muted-foreground/80 opacity-80"
                            >
                              {lessonRow}
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                                Locked
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto">
          <div className="border-b border-border bg-card">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
              <div className="mb-4 flex items-center justify-between gap-4 md:hidden">
                <div>
                  <p className="text-xs font-semibold text-foreground">{progress}% through course</p>
                  <p className="text-[11px] text-muted-foreground">
                    {completedCount} / {allLessons.length} completed
                  </p>
                </div>
                <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary-blue" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="overflow-hidden rounded-[28px] border border-slate-900 bg-slate-950 shadow-lg">
                {(hasTimedPreviewLimit || hasPdfPreviewLimit) && previewStatusText ? (
                  <div className="border-b border-white/10 bg-black/30 px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                          Limited preview
                        </p>
                        <p className="mt-1 text-sm text-white">{previewStatusText}</p>
                      </div>
                      <Link
                        href={`/courses/${course.slug}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90"
                      >
                        Unlock Full Course
                        <Lock className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-primary-blue transition-[width] duration-300"
                        style={{ width: `${previewProgress}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="relative flex aspect-video w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                  {currentLesson.type === "VIDEO" && primaryAssetUrl ? (
                    <>
                      <video
                        controls
                        className="h-full w-full bg-black"
                        src={primaryAssetUrl}
                        onTimeUpdate={handleTimedPreviewUpdate}
                      />
                      {previewLocked ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 px-6 text-center">
                          <div className="max-w-md rounded-[28px] border border-white/10 bg-black/40 p-6 backdrop-blur">
                            <Lock className="mx-auto mb-4 h-12 w-12 text-primary-blue" />
                            <h3 className="text-xl font-bold text-white">Preview complete</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                              You&apos;ve reached the {previewMinutesLimit}-minute preview for this lesson. Unlock the full course to continue watching.
                            </p>
                            <Link
                              href={`/courses/${course.slug}`}
                              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90"
                            >
                              Unlock Full Course
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : currentLesson.type === "AUDIO" && primaryAssetUrl ? (
                    <div className="relative z-10 w-full max-w-2xl px-6 text-center sm:px-8">
                      <Volume2 className="mx-auto mb-4 h-16 w-16 text-primary-blue" />
                      <h3 className="mb-3 text-2xl font-bold text-white">{currentLesson.title}</h3>
                      <p className="mb-6 text-slate-300">
                        {currentLesson.description || "Listen directly inside the platform."}
                      </p>
                      <audio
                        controls
                        className="mx-auto w-full max-w-xl"
                        src={primaryAssetUrl}
                        onTimeUpdate={handleTimedPreviewUpdate}
                      />
                      {previewLocked ? (
                        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/40 p-5">
                          <p className="text-sm leading-6 text-slate-300">
                            You&apos;ve reached the {previewMinutesLimit}-minute audio preview.
                          </p>
                          <Link
                            href={`/courses/${course.slug}`}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90"
                          >
                            Unlock Full Course
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  ) : currentLesson.type === "PDF" && primaryAssetUrl ? (
                    <div className="flex h-full w-full flex-col">
                      {hasPdfPreviewLimit && previewPagesLimit ? (
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3 text-white sm:px-6">
                          <button
                            type="button"
                            onClick={() => setPreviewPdfPage((current) => Math.max(1, current - 1))}
                            disabled={previewPdfPage <= 1}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Previous page
                          </button>
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                            Page {previewPdfPage} of {previewPagesLimit}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewPdfPage((current) => Math.min(previewPagesLimit, current + 1))
                            }
                            disabled={previewPdfPage >= previewPagesLimit}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next page
                          </button>
                        </div>
                      ) : null}
                      <iframe
                        src={
                          hasPdfPreviewLimit
                            ? `${primaryAssetUrl}#toolbar=0&navpanes=0&scrollbar=0&page=${previewPdfPage}`
                            : primaryAssetUrl
                        }
                        title={currentLesson.title}
                        className={cn("h-full w-full bg-white", hasPdfPreviewLimit && "pointer-events-none")}
                      />
                      {pdfPreviewMaxed ? (
                        <div className="border-t border-white/10 bg-black/35 px-4 py-4 text-center sm:px-6">
                          <p className="text-sm leading-6 text-slate-300">
                            This preview is limited to {previewPagesLimit} page{previewPagesLimit === 1 ? "" : "s"}.
                            Unlock the course to read the full lesson.
                          </p>
                          <Link
                            href={`/courses/${course.slug}`}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90"
                          >
                            Unlock Full Course
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  ) : currentLesson.type === "QUIZ" ? (
                    <div className="relative z-10 p-8 text-center">
                      <BarChart2 className="mx-auto mb-4 h-16 w-16 text-primary-blue" />
                      <h3 className="mb-2 text-2xl font-bold text-white">Module Quiz</h3>
                      <p className="mb-6 text-slate-300">
                        Test your understanding of the lesson material.
                      </p>
                      <button className="rounded-xl bg-primary-blue px-8 py-3 font-semibold text-white hover:bg-primary-blue/90">
                        Start quiz
                      </button>
                    </div>
                  ) : currentLesson.type === "PROJECT" || currentLesson.type === "ASSIGNMENT" ? (
                    <div className="relative z-10 p-8 text-center">
                      <Award className="mx-auto mb-4 h-16 w-16 text-amber-400" />
                      <h3 className="mb-2 text-2xl font-bold text-white">Assignment Brief</h3>
                      <p className="mb-6 text-slate-300">
                        {currentLesson.content ||
                          currentLesson.description ||
                          "Apply the concepts in a practical, portfolio-ready assignment."}
                      </p>
                      {primaryAssetUrl ? (
                        <a
                          href={primaryAssetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-primary-blue px-8 py-3 font-semibold text-white hover:bg-primary-blue/90"
                        >
                          Open assignment asset
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <div className="relative z-10 max-w-2xl p-8 text-center">
                      <FileText className="mx-auto mb-4 h-16 w-16 text-primary-blue" />
                      <h3 className="mb-2 text-2xl font-bold text-white">{currentLesson.title}</h3>
                      <p className="text-slate-300">
                        {currentLesson.content?.slice(0, 220) ||
                          currentLesson.description ||
                          "Read through the written lesson content and take notes as you go."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="mb-1 text-2xl font-black text-foreground">{currentLesson.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {course.title} / {currentModule?.title}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                {currentLessonCompleted ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary-blue/20 bg-primary-blue/10 px-3 py-1 text-xs font-semibold text-primary-blue">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed
                  </span>
                ) : null}

                {hasFullCourseAccess ? (
                  <button
                    onClick={() => void persistLessonCompletion(!currentLessonCompleted)}
                    disabled={completionPending}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70",
                      currentLessonCompleted
                        ? "border border-border bg-card text-muted-foreground hover:border-primary-blue/20 hover:bg-primary-blue/10 hover:text-primary-blue"
                        : "bg-primary-blue text-white hover:bg-primary-blue/90"
                    )}
                  >
                    {completionPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {currentLessonCompleted ? "Mark incomplete" : "Mark complete"}
                  </button>
                ) : (
                  <Link
                    href={`/courses/${course.slug}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90"
                  >
                    <Lock className="h-4 w-4" />
                    Unlock full course
                  </Link>
                )}
              </div>
            </div>

            <div className="mb-8 flex items-center justify-between border-b border-border pb-6">
              {prevLesson ? (
                <Link
                  href={`/learn/${course.slug}/${prevLesson.id}`}
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  <span className="hidden max-w-[220px] truncate sm:block">{prevLesson.title}</span>
                  <span className="sm:hidden">Previous</span>
                </Link>
              ) : (
                <div />
              )}

              {nextLesson ? (
                <Link
                  href={`/learn/${course.slug}/${nextLesson.id}`}
                  className="group flex items-center gap-2 text-sm font-medium text-primary-blue hover:text-primary-blue/80"
                >
                  <span className="hidden max-w-[220px] truncate sm:block">{nextLesson.title}</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : hasLockedLessonsAhead ? (
                <Link
                  href={`/courses/${course.slug}`}
                  className="flex items-center gap-2 text-sm font-medium text-primary-blue"
                >
                  <Lock className="h-4 w-4" />
                  Unlock full course
                </Link>
              ) : (
                <Link
                  href={`/courses/${course.slug}`}
                  className="flex items-center gap-2 text-sm font-medium text-primary-blue"
                >
                  <Award className="h-4 w-4" />
                  Back to course
                </Link>
              )}
            </div>

            <div className="mb-6 flex gap-1 rounded-2xl border border-border bg-card p-1">
              {(["overview", "notes", "resources"] as const).map((entry) => (
                <button
                  key={entry}
                  onClick={() => {
                    setTab(entry);
                    if (entry === "notes") {
                      setNotesPanelOpen(true);
                    }
                  }}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-medium capitalize transition-colors",
                    tab === entry
                      ? "bg-primary-blue text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {entry}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div className="space-y-6">
                <div className="surface-card p-6">
                  <h3 className="mb-3 text-base font-bold text-foreground">About this lesson</h3>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {currentLesson.description ||
                      currentLesson.content ||
                      `Work through ${currentLesson.title.toLowerCase()} to connect the concept to practical execution.`}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Was this helpful?
                  </span>
                  <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary-blue/30 hover:bg-primary-blue/10 hover:text-primary-blue">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Yes
                  </button>
                  <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary-blue/30 hover:bg-primary-blue/10 hover:text-primary-blue">
                    <Flag className="h-3.5 w-3.5" />
                    Report
                  </button>
                </div>
              </div>
            )}

            {tab === "notes" && (
              <div className="space-y-5">
                <div className="surface-card p-6">
                  {/* Updated: lesson notes now live in a floating workspace so they stay available across every player tab. */}
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                        <NotebookText className="h-4 w-4 text-primary-blue" />
                        Floating lesson notes
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Keep the panel open while you switch tabs. Notes save only when you click the blue Save Notes button.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openNotesPanel}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90"
                    >
                      <NotebookText className="h-4 w-4" />
                      {notesPanelOpen ? "Focus Notes Panel" : "Open Notes Panel"}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-background/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue">
                        Current draft
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {noteContent.trim().length > 0
                          ? noteContent
                          : viewerId
                            ? "Open the floating notes panel to start writing for this lesson."
                            : "Sign in to save notes for this lesson."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/80 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue">
                        <Clock3 className="h-3.5 w-3.5" />
                        Save status
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{notesStatusLabel}</p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {savedNotes[0]
                          ? `Latest lesson snapshot: ${formatSavedAt(savedNotes[0].timestamp)}`
                          : "Saved note snapshots for this lesson will appear as you study."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="surface-card p-6" id="lesson-saved-notes">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h4 className="text-base font-bold text-foreground">Saved notes</h4>
                    <Link
                      href="/dashboard#workspace-notes"
                      className="text-sm font-medium text-primary-blue hover:text-primary-blue/80"
                    >
                      View all workspace notes
                    </Link>
                  </div>

                  {savedNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Your saved note snapshots for this lesson will appear here.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {savedNotes.map((note) => (
                        <div key={note.id} className="rounded-2xl border border-border bg-background/80 p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue">
                            {formatSavedAt(note.timestamp)}
                          </p>
                          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                            {note.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "resources" && (
              <div className="space-y-3">
                {resources.length === 0 ? (
                  <div className="surface-card p-6 text-sm text-muted-foreground">
                    No external lesson resources are attached yet.
                  </div>
                ) : (
                  resources.map((resource) => (
                    <a
                      key={resource.href}
                      href={resource.href}
                      target="_blank"
                      rel="noreferrer"
                      className="surface-card flex items-center gap-4 p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
                        <Download className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{resource.name}</p>
                        <p className="text-xs text-muted-foreground">{resource.type.toUpperCase()}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-blue">
                        Open <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        </main>

        <AnimatePresence>
          {copilotOpen && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 384 }}
              exit={{ width: 0 }}
              className="hidden shrink-0 overflow-hidden border-l border-border xl:block"
            >
              <AICopilot courseTitle={course.title} onClose={() => setCopilotOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {notesPanelOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none fixed inset-0 z-40"
          >
            <div
              ref={notesPanelRef}
              className={cn(
                "pointer-events-auto fixed overflow-hidden rounded-[28px] border border-border bg-card/96 shadow-[0_32px_90px_-40px_rgba(15,23,42,0.72)] backdrop-blur-xl",
                isDesktopPanel
                  ? "resize overflow-auto"
                  : "inset-x-3 bottom-3 top-[5.25rem]"
              )}
              style={
                isDesktopPanel
                  ? {
                      left: notesPanelPosition.x,
                      top: notesPanelPosition.y,
                      width: notesPanelSize.width,
                      height: notesPanelSize.height,
                      minWidth: DESKTOP_PANEL_MIN_WIDTH,
                      minHeight: DESKTOP_PANEL_MIN_HEIGHT,
                    }
                  : undefined
              }
            >
              {/* Updated: floating notes panel is draggable on desktop and stays open while the learner navigates the player. */}
              <div
                onPointerDown={beginNotesPanelDrag}
                className={cn(
                  "flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3",
                  isDesktopPanel ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
                    <NotebookText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">Notes for {currentLesson.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{notesStatusLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isDesktopPanel ? (
                    <button
                      type="button"
                      onClick={resetNotesPanelLayout}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary-blue/20 hover:bg-primary-blue/10 hover:text-primary-blue"
                      aria-label="Reset notes panel layout"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setNotesPanelOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary-blue/20 hover:bg-primary-blue/10 hover:text-primary-blue"
                    aria-label="Close notes panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex h-[calc(100%-4.25rem)] flex-col">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Grip className="h-3.5 w-3.5 text-primary-blue" />
                    {isDesktopPanel ? "Drag from the header and resize from the corner." : "Floating notes panel"}
                  </div>
                  <Link
                    href="/dashboard#workspace-notes"
                    className="text-xs font-semibold text-primary-blue hover:text-primary-blue/80"
                  >
                    Workspace Notes
                  </Link>
                </div>

                <div className="flex flex-1 flex-col gap-4 p-4">
                  <textarea
                    value={noteContent}
                    onChange={(event) => setNoteContent(event.target.value)}
                    placeholder={
                      viewerId
                        ? "Capture what matters from this lesson. Your save creates a timestamped snapshot for this lesson."
                        : "Sign in to save notes for this lesson."
                    }
                    disabled={!viewerId}
                    className="input-surface min-h-[220px] w-full flex-1 resize-none disabled:cursor-not-allowed disabled:opacity-70"
                  />

                  <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-muted-foreground">
                      {noteHasChanges
                        ? "You have unsaved changes for this lesson."
                        : savedNotes[0]
                          ? `Latest lesson snapshot: ${formatSavedAt(savedNotes[0].timestamp)}`
                          : "No saved lesson snapshot yet."}
                    </div>
                    <button
                      type="button"
                      onClick={() => void saveNote()}
                      disabled={!viewerId || !noteCanSave || noteState === "saving"}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {noteState === "saving" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Notes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
