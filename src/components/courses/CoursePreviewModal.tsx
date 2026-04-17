"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactPlayer from "react-player";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Lock,
  Play,
  Volume2,
  X,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { Course, CoursePreviewLessonState, CoursePreviewState } from "@/types";

type CoursePreviewModalProps = {
  accessActionLabel: string;
  course: Course;
  hasAccess: boolean;
  lockedActionLabel: string;
  lockedActionPending?: boolean;
  lockedActionVariant?: "primary" | "cart";
  onAccessAction: () => void;
  onLockedAction: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  previewState?: CoursePreviewState | null;
};

function buildPdfViewerUrl(sourceUrl: string, pageNumber: number, lockedPreview: boolean) {
  const baseUrl = sourceUrl.split("#")[0];
  const hashParams = new URLSearchParams({
    page: String(pageNumber),
    view: "FitH",
  });

  if (lockedPreview) {
    hashParams.set("toolbar", "0");
    hashParams.set("navpanes", "0");
    hashParams.set("scrollbar", "0");
  }

  return `${baseUrl}#${hashParams.toString()}`;
}

function formatPreviewCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buildFallbackPreview(course: Course, previewState?: CoursePreviewState | null): CoursePreviewLessonState[] {
  const fallbackUrl = previewState?.previewVideoUrl || course.previewVideoUrl;

  if (!fallbackUrl) {
    return [];
  }

  return [
    {
      id: `${course.id}-course-trailer`,
      title: "Course trailer",
      type: "VIDEO",
      sourceUrl: fallbackUrl,
      moduleTitle: "Overview",
    },
  ];
}

export function CoursePreviewModal({
  accessActionLabel,
  course,
  hasAccess,
  lockedActionLabel,
  lockedActionPending = false,
  lockedActionVariant = "primary",
  onAccessAction,
  onLockedAction,
  onOpenChange,
  open,
  previewState,
}: CoursePreviewModalProps) {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [previewElapsedSeconds, setPreviewElapsedSeconds] = useState(0);
  const [timedPreviewLocked, setTimedPreviewLocked] = useState(false);
  const [pdfPage, setPdfPage] = useState(1);

  const previewLessons = useMemo(() => {
    const configuredLessons = previewState?.previewLessons ?? [];
    return configuredLessons.length > 0 ? configuredLessons : buildFallbackPreview(course, previewState);
  }, [course, previewState]);

  const activePreview =
    previewLessons.find((lesson) => lesson.id === activePreviewId) ?? previewLessons[0] ?? null;
  const timedPreviewLimitSeconds =
    activePreview?.previewMinutes && activePreview.previewMinutes > 0
      ? activePreview.previewMinutes * 60
      : 0;
  const pdfPreviewPageLimit =
    activePreview?.type === "PDF" && activePreview.previewPages && activePreview.previewPages > 0
      ? activePreview.previewPages
      : null;
  const effectivePdfLimit = pdfPreviewPageLimit ?? null;
  const previewRemainingSeconds =
    timedPreviewLimitSeconds > 0
      ? Math.max(timedPreviewLimitSeconds - Math.floor(previewElapsedSeconds), 0)
      : 0;
  const pdfPreviewMaxed = Boolean(
    !hasAccess && effectivePdfLimit && pdfPage >= effectivePdfLimit
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setActivePreviewId(previewLessons[0]?.id ?? null);
  }, [open, previewLessons]);

  useEffect(() => {
    setPreviewElapsedSeconds(0);
    setTimedPreviewLocked(false);
    setPdfPage(1);
  }, [activePreviewId]);

  function clampTimedPreview(nextTime: number) {
    if (!timedPreviewLimitSeconds || hasAccess) {
      setPreviewElapsedSeconds(nextTime);
      return;
    }

    const clampedTime = Math.min(nextTime, timedPreviewLimitSeconds);
    setPreviewElapsedSeconds(clampedTime);

    if (nextTime >= timedPreviewLimitSeconds && playerRef.current) {
      playerRef.current.currentTime = timedPreviewLimitSeconds;
      playerRef.current.pause();
      setTimedPreviewLocked(true);
    }
  }

  function handleMediaTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
    clampTimedPreview(event.currentTarget.currentTime);
  }

  function handleMediaSeeking(event: SyntheticEvent<HTMLVideoElement>) {
    if (!timedPreviewLimitSeconds || hasAccess) {
      return;
    }

    const nextTime = event.currentTarget.currentTime;

    if (nextTime > timedPreviewLimitSeconds) {
      event.currentTarget.currentTime = Math.min(previewElapsedSeconds, timedPreviewLimitSeconds);
    }
  }

  const primaryButtonClassName = cn(
    "inline-flex w-full items-center justify-center rounded-[16px] px-4 py-3 text-sm font-semibold transition-all duration-300",
    lockedActionVariant === "cart"
      ? "border border-primary-blue/35 bg-primary-blue/16 text-white hover:bg-primary-blue/24"
      : "bg-primary-blue text-white shadow-[0_24px_44px_-28px_rgba(0,86,210,0.95)] hover:bg-primary-blue/90"
  );

  const renderPreviewContent = () => {
    if (!activePreview) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center">
          <div>
            <p className="text-lg font-semibold text-white">Preview content coming soon</p>
            <p className="mt-3 text-sm leading-7 text-white/64">
              This course does not have a lesson preview configured yet.
            </p>
          </div>
        </div>
      );
    }

    if (
      (activePreview.type === "VIDEO" ||
        activePreview.type === "AUDIO" ||
        activePreview.type === "LIVE") &&
      activePreview.sourceUrl
    ) {
      return (
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_30px_90px_-50px_rgba(15,23,42,0.95)]">
          <div className="aspect-video bg-black">
            <ReactPlayer
              ref={playerRef}
              src={activePreview.sourceUrl}
              controls
              width="100%"
              height="100%"
              playing={open && !timedPreviewLocked}
              playsInline
              onTimeUpdate={handleMediaTimeUpdate}
              onSeeking={handleMediaSeeking}
              onEnded={() => {
                if (!hasAccess && timedPreviewLimitSeconds > 0) {
                  setTimedPreviewLocked(true);
                }
              }}
              style={{ backgroundColor: "#000" }}
            />
          </div>

          {(timedPreviewLimitSeconds > 0 || timedPreviewLocked) && !hasAccess ? (
            <div className="border-t border-white/10 bg-slate-950/92 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                    Limited Preview
                  </p>
                  <p className="mt-1 text-sm text-white">
                    {timedPreviewLocked
                      ? `You have reached the ${activePreview.previewMinutes}-minute preview limit for this lesson.`
                      : `Preview ends in ${formatPreviewCountdown(previewRemainingSeconds)}.`}
                  </p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 sm:w-48">
                  <div
                    className="h-full rounded-full bg-primary-blue"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((previewElapsedSeconds / timedPreviewLimitSeconds) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    if (activePreview.type === "PDF" && activePreview.sourceUrl) {
      const lockedPdfPreview = !hasAccess && Boolean(pdfPreviewPageLimit);
      const pdfViewerUrl = buildPdfViewerUrl(
        activePreview.sourceUrl,
        pdfPage,
        lockedPdfPreview
      );

      return (
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] shadow-[0_30px_90px_-50px_rgba(15,23,42,0.95)]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                PDF Preview
              </p>
              <p className="mt-1 text-sm text-white/72">
                {effectivePdfLimit && !hasAccess
                  ? `Page ${pdfPage} of ${effectivePdfLimit} unlocked for preview`
                  : hasAccess
                    ? "Full PDF access is unlocked below."
                    : "Interactive PDF preview is available below."}
              </p>
            </div>

            {effectivePdfLimit && !hasAccess ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPdfPage((current) => Math.max(1, current - 1))}
                  disabled={pdfPage <= 1}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 text-white/72 hover:border-primary-blue/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPdfPage((current) =>
                      effectivePdfLimit ? Math.min(effectivePdfLimit, current + 1) : current
                    )
                  }
                  disabled={!effectivePdfLimit || pdfPage >= effectivePdfLimit}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 text-white/72 hover:border-primary-blue/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          <div className="bg-slate-950/96 px-3 py-4 sm:px-6 sm:py-6">
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white shadow-[0_24px_70px_-44px_rgba(15,23,42,0.85)]">
              <iframe
                key={`${activePreview.id}-${pdfPage}-${lockedPdfPreview ? "locked" : "interactive"}`}
                src={pdfViewerUrl}
                title={`${activePreview.title} PDF preview`}
                className={cn(
                  "h-[72vh] w-full bg-white",
                  lockedPdfPreview && "pointer-events-none"
                )}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-white/54">
              {lockedPdfPreview
                ? "Preview pages stay inside the approved admin limit, so navigation is handled by the buttons above."
                : "If the browser PDF viewer takes a second to render, keep the modal open and it will appear in place."}
            </p>
          </div>

          {pdfPreviewMaxed ? (
            <div className="border-t border-white/10 bg-slate-950/92 px-4 py-4 text-sm text-white sm:px-6">
              You have reached the {effectivePdfLimit} page preview limit for this PDF lesson.
            </div>
          ) : null}
        </div>
      );
    }

    if (activePreview.content?.trim()) {
      return (
        <div className="min-h-[320px] rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.95)] sm:p-8">
          <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-7 text-white/78">
            {activePreview.content}
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center">
        <div>
          <p className="text-lg font-semibold text-white">Preview unavailable</p>
          <p className="mt-3 text-sm leading-7 text-white/64">
            This lesson does not have a playable preview asset attached.
          </p>
        </div>
      </div>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[130] bg-slate-950/82 backdrop-blur-md" />
        <Dialog.Content className="fixed inset-0 z-[131] flex h-screen flex-col bg-[#02050b] text-white focus:outline-none">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-lg font-black text-white sm:text-xl">
                Course Preview - {course.title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-white/62">
                Preview lesson access honors the exact admin limits for timed media and PDF pages.
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/72 hover:border-primary-blue/30 hover:bg-white/10 hover:text-white"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="border-b border-white/10 bg-white/[0.03] lg:overflow-y-auto lg:border-b-0 lg:border-r">
              <div className="px-4 py-4 sm:px-6 lg:px-6">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                    Preview Lessons
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/64">
                    Pick a lesson below. Video and audio previews stop at the admin-defined minute limit, and PDFs stay locked to their approved pages.
                  </p>
                </div>

                {previewLessons.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                    {previewLessons.map((lesson, index) => {
                      const isActive = lesson.id === activePreview?.id;
                      const lessonIcon =
                        lesson.type === "PDF" ? (
                          <FileText className="h-4 w-4" />
                        ) : lesson.type === "AUDIO" ? (
                          <Volume2 className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        );

                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => setActivePreviewId(lesson.id)}
                          className={cn(
                            "min-w-[220px] rounded-[24px] border px-4 py-4 text-left transition-all lg:min-w-0",
                            isActive
                              ? "border-primary-blue/40 bg-primary-blue/16 shadow-[0_24px_60px_-42px_rgba(0,86,210,0.9)]"
                              : "border-white/10 bg-white/[0.03] hover:border-primary-blue/24 hover:bg-white/[0.06]"
                          )}
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-2xl",
                                isActive ? "bg-primary-blue text-white" : "bg-white/8 text-white/72"
                              )}
                            >
                              {lessonIcon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/46">
                                Preview {index + 1}
                              </p>
                              <p className="truncate text-sm font-semibold text-white">{lesson.moduleTitle || "Preview lesson"}</p>
                            </div>
                          </div>
                          <p className="line-clamp-2 text-sm font-medium text-white">{lesson.title}</p>
                          <p className="mt-2 text-xs text-white/56">
                            {lesson.type === "PDF" && lesson.previewPages
                              ? `${lesson.previewPages} page preview`
                              : lesson.previewMinutes
                                ? `${lesson.previewMinutes} minute preview`
                                : lesson.type}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-white/56">
                    No lesson previews are configured for this course yet.
                  </div>
                )}
              </div>
            </aside>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
                <div className="mx-auto w-full max-w-5xl">
                  {activePreview ? (
                    <div className="mb-5 flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-primary-blue/28 bg-primary-blue/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                        {activePreview.type}
                      </span>
                      {timedPreviewLimitSeconds > 0 && !hasAccess ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/72">
                          <Clock3 className="h-3.5 w-3.5 text-primary-blue" />
                          Preview ends in {formatPreviewCountdown(previewRemainingSeconds)}
                        </span>
                      ) : null}
                      {pdfPreviewPageLimit && !hasAccess ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/72">
                          <Lock className="h-3.5 w-3.5 text-primary-blue" />
                          {pdfPreviewPageLimit} preview page{pdfPreviewPageLimit === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mb-5">
                    <h3 className="text-2xl font-black text-white">
                      {activePreview?.title || "Preview unavailable"}
                    </h3>
                    {activePreview?.moduleTitle ? (
                      <p className="mt-2 text-sm text-white/62">{activePreview.moduleTitle}</p>
                    ) : null}
                  </div>

                  {renderPreviewContent()}
                </div>
              </div>

              <div className="border-t border-white/10 bg-slate-950/92 px-4 py-4 sm:px-6 lg:px-8">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {hasAccess
                        ? "You already have access to the full classroom experience."
                        : course.price === 0 || course.isFree
                          ? "Unlock the full course instantly and keep your place."
                          : `Unlock the full course for ${formatPrice(course.price, course.currency)}.`}
                    </p>
                    <p className="mt-1 text-sm text-white/56">
                      {hasAccess
                        ? "We will send you straight into the full course player with your current progress."
                        : timedPreviewLocked || pdfPreviewMaxed
                          ? "You have reached the preview limit. Continue to unlock every lesson, resource, and progress tracker."
                          : "Keep exploring the preview or jump into the full course whenever you are ready."}
                    </p>
                  </div>

                  {hasAccess ? (
                    <button
                      type="button"
                      onClick={onAccessAction}
                      className="inline-flex w-full items-center justify-center rounded-[16px] bg-primary-blue px-4 py-3 text-sm font-semibold text-white shadow-[0_24px_44px_-28px_rgba(0,86,210,0.95)] transition-all duration-300 hover:bg-primary-blue/90 lg:w-auto lg:min-w-[240px]"
                    >
                      {accessActionLabel}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onLockedAction()}
                      disabled={lockedActionPending}
                      className={cn(primaryButtonClassName, "lg:min-w-[240px]")}
                    >
                      {lockedActionLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
