"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AICopilot } from "@/components/courses/AICopilot";
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
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import type { Course } from "@/types";

export function LessonPlayerClient({
  course,
  initialLessonId,
}: {
  course: Course;
  initialLessonId: string;
}) {
  const modules = course.modules ?? [];
  const allLessons = useMemo(() => modules.flatMap((module) => module.lessons), [modules]);
  const currentLesson = allLessons.find((lesson) => lesson.id === initialLessonId) ?? allLessons[0];
  const currentIndex = allLessons.findIndex((lesson) => lesson.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : undefined;
  const nextLesson = currentIndex >= 0 ? allLessons[currentIndex + 1] : undefined;
  const currentModule = modules.find((module) =>
    module.lessons.some((lesson) => lesson.id === currentLesson.id)
  );
  const primaryAssetUrl = currentLesson.assetUrl || currentLesson.videoUrl;
  const resources = [
    primaryAssetUrl && currentLesson.allowDownload
      ? { name: "Lesson asset", href: primaryAssetUrl, type: currentLesson.type.toLowerCase() }
      : null,
    course.previewVideoUrl
      ? { name: "Course preview", href: course.previewVideoUrl, type: "video" }
      : null,
  ].filter(Boolean) as Array<{ name: string; href: string; type: string }>;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "notes" | "resources">("overview");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setCompleted(false);
  }, [currentLesson.id]);

  const progress =
    allLessons.length > 0 && currentIndex >= 0
      ? Math.round(((currentIndex + 1) / allLessons.length) * 100)
      : 0;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-white/90 px-4 backdrop-blur-xl dark:bg-slate-950/90">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-xl border border-border p-2 text-muted-foreground hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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

        <div className="hidden items-center gap-3 md:flex">
          <div className="h-2 w-36 overflow-hidden rounded-full bg-muted">
            <div className="progress-glow h-full rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{progress}% through course</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCopilotOpen(!copilotOpen)}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:block">AI Copilot</span>
          </button>

          {nextLesson ? (
            <Link
              href={`/learn/${course.slug}/${nextLesson.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
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
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Course content
                  </p>
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

                          return (
                            <Link
                              key={lesson.id}
                              href={`/learn/${course.slug}/${lesson.id}`}
                              className={cn(
                                "flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-all",
                                isActive
                                  ? "border border-blue-200 bg-blue-50 text-blue-700"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <span className="shrink-0">
                                {lesson.type === "QUIZ" ? (
                                  <BarChart2 className="h-3.5 w-3.5 text-blue-600" />
                                ) : lesson.type === "PROJECT" || lesson.type === "ASSIGNMENT" ? (
                                  <Award className="h-3.5 w-3.5 text-amber-500" />
                                ) : lesson.type === "AUDIO" ? (
                                  <Volume2 className="h-3.5 w-3.5 text-cyan-500" />
                                ) : lesson.type === "PDF" || lesson.type === "TEXT" ? (
                                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                                ) : isActive ? (
                                  <Play className="h-3.5 w-3.5" />
                                ) : (
                                  <Circle className="h-3.5 w-3.5" />
                                )}
                              </span>
                              <span className="flex-1 line-clamp-1">{lesson.title}</span>
                              {lesson.isPreview && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
                                  Preview
                                </span>
                              )}
                              {(lesson.duration ?? 0) > 0 && (
                                <span className="shrink-0 text-[11px]">
                                  {Math.ceil((lesson.duration ?? 0) / 60)}m
                                </span>
                              )}
                            </Link>
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
              <div className="overflow-hidden rounded-[28px] border border-slate-900 bg-slate-950 shadow-lg">
                <div className="relative flex aspect-video w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                  {currentLesson.type === "VIDEO" && primaryAssetUrl ? (
                    <video controls className="h-full w-full bg-black" src={primaryAssetUrl} />
                  ) : currentLesson.type === "AUDIO" && primaryAssetUrl ? (
                    <div className="relative z-10 w-full max-w-2xl px-8 text-center">
                      <Volume2 className="mx-auto mb-4 h-16 w-16 text-cyan-300" />
                      <h3 className="mb-3 text-2xl font-bold text-white">{currentLesson.title}</h3>
                      <p className="mb-6 text-slate-300">{currentLesson.description || "Listen directly inside the platform."}</p>
                      <audio controls className="mx-auto w-full max-w-xl" src={primaryAssetUrl} />
                    </div>
                  ) : currentLesson.type === "PDF" && primaryAssetUrl ? (
                    <iframe
                      src={primaryAssetUrl}
                      title={currentLesson.title}
                      className="h-full w-full bg-white"
                    />
                  ) : currentLesson.type === "QUIZ" ? (
                    <div className="relative z-10 p-8 text-center">
                      <BarChart2 className="mx-auto mb-4 h-16 w-16 text-blue-400" />
                      <h3 className="mb-2 text-2xl font-bold text-white">Module Quiz</h3>
                      <p className="mb-6 text-slate-300">
                        Test your understanding of the lesson material.
                      </p>
                      <button className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700">
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
                          className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700"
                        >
                          Open assignment asset
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <div className="relative z-10 max-w-2xl p-8 text-center">
                      <FileText className="mx-auto mb-4 h-16 w-16 text-blue-400" />
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
                  {course.title} · {currentModule?.title}
                </p>
              </div>

              <button
                onClick={() => setCompleted(!completed)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                  completed
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-border bg-card text-muted-foreground hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                {completed ? "Completed" : "Mark complete"}
              </button>
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
                  className="group flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  <span className="hidden max-w-[220px] truncate sm:block">{nextLesson.title}</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <Link href={`/courses/${course.slug}`} className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <Award className="h-4 w-4" />
                  Back to course
                </Link>
              )}
            </div>

            <div className="mb-6 flex gap-1 rounded-2xl border border-border bg-card p-1">
              {(["overview", "notes", "resources"] as const).map((entry) => (
                <button
                  key={entry}
                  onClick={() => setTab(entry)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-medium capitalize",
                    tab === entry ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
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
                  <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Yes
                  </button>
                  <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                    <Flag className="h-3.5 w-3.5" />
                    Report
                  </button>
                </div>
              </div>
            )}

            {tab === "notes" && (
              <div className="surface-card p-6">
                <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
                  <FileText className="h-4 w-4 text-blue-600" />
                  My notes
                </h3>
                <textarea
                  placeholder="Take notes for this lesson. They can be saved to your workspace."
                  rows={10}
                  className="input-surface w-full resize-none"
                />
                <button className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  Save notes
                </button>
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                        <Download className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{resource.name}</p>
                        <p className="text-xs text-muted-foreground">{resource.type.toUpperCase()}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
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
    </div>
  );
}
