"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileAudio, FileText, FileVideo, GripVertical, ListChecks, Plus, ScrollText, Trash2 } from "lucide-react";
import { MediaUploader, type UploadedAsset } from "@/components/admin/media-uploader";
import {
  AdminButton,
  AdminCard,
  AdminCheckbox,
  AdminInput,
  AdminSelect,
  AdminSwitch,
  AdminTextarea,
  FieldLabel,
  StatusPill,
} from "@/components/admin/ui";

export type CourseLessonDraft = {
  id?: string;
  localId: string;
  title: string;
  description: string;
  type: "VIDEO" | "AUDIO" | "PDF" | "QUIZ" | "ASSIGNMENT" | "TEXT" | "PROJECT" | "LIVE";
  assetUrl: string;
  assetPath: string;
  durationMinutes: string;
  content: string;
  isPreview: boolean;
  allowDownload: boolean;
  sellSeparately: boolean;
  isExpanded: boolean;
};

export type CourseSectionDraft = {
  id?: string;
  localId: string;
  title: string;
  description: string;
  isExpanded: boolean;
  lessons: CourseLessonDraft[];
};

type DragState =
  | { type: "section"; sectionLocalId: string }
  | { type: "lesson"; sectionLocalId: string; lessonLocalId: string }
  | null;

function createDraftId() {
  return Math.random().toString(36).slice(2, 11);
}

export function createEmptyLesson(): CourseLessonDraft {
  return {
    localId: createDraftId(),
    title: "",
    description: "",
    type: "VIDEO",
    assetUrl: "",
    assetPath: "",
    durationMinutes: "",
    content: "",
    isPreview: false,
    allowDownload: false,
    sellSeparately: false,
    isExpanded: true,
  };
}

export function createEmptySection(): CourseSectionDraft {
  return {
    localId: createDraftId(),
    title: "",
    description: "",
    isExpanded: true,
    lessons: [createEmptyLesson()],
  };
}

function reorderList<T extends { localId: string }>(items: T[], activeId: string, targetId: string) {
  const activeIndex = items.findIndex((item) => item.localId === activeId);
  const targetIndex = items.findIndex((item) => item.localId === targetId);

  if (activeIndex < 0 || targetIndex < 0 || activeIndex === targetIndex) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(activeIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function moveLessonBetweenSections(
  sections: CourseSectionDraft[],
  sourceSectionId: string,
  sourceLessonId: string,
  targetSectionId: string,
  targetLessonId?: string
) {
  const nextSections = sections.map((section) => ({ ...section, lessons: [...section.lessons] }));
  const sourceSection = nextSections.find((section) => section.localId === sourceSectionId);
  const targetSection = nextSections.find((section) => section.localId === targetSectionId);

  if (!sourceSection || !targetSection) {
    return sections;
  }

  const sourceIndex = sourceSection.lessons.findIndex((lesson) => lesson.localId === sourceLessonId);
  if (sourceIndex < 0) {
    return sections;
  }

  const [movedLesson] = sourceSection.lessons.splice(sourceIndex, 1);

  if (!targetLessonId) {
    targetSection.lessons.push(movedLesson);
    return nextSections;
  }

  const targetIndex = targetSection.lessons.findIndex((lesson) => lesson.localId === targetLessonId);
  if (targetIndex < 0) {
    targetSection.lessons.push(movedLesson);
    return nextSections;
  }

  targetSection.lessons.splice(targetIndex, 0, movedLesson);
  return nextSections;
}

function getLessonIcon(type: CourseLessonDraft["type"]) {
  switch (type) {
    case "AUDIO":
      return FileAudio;
    case "PDF":
    case "TEXT":
      return FileText;
    case "QUIZ":
      return ListChecks;
    case "ASSIGNMENT":
    case "PROJECT":
      return ScrollText;
    default:
      return FileVideo;
  }
}

export function normalizeLessonType(type: CourseLessonDraft["type"]) {
  if (type === "PROJECT") {
    return "ASSIGNMENT";
  }

  return type;
}

export function CourseStructureBuilder({
  courseId,
  sections,
  onChange,
}: {
  courseId?: string;
  sections: CourseSectionDraft[];
  onChange: (sections: CourseSectionDraft[]) => void;
}) {
  const [dragState, setDragState] = useState<DragState>(null);

  function updateSection(sectionLocalId: string, patch: Partial<CourseSectionDraft>) {
    onChange(
      sections.map((section) =>
        section.localId === sectionLocalId ? { ...section, ...patch } : section
      )
    );
  }

  function removeSection(sectionLocalId: string) {
    onChange(sections.filter((section) => section.localId !== sectionLocalId));
  }

  function addSection() {
    onChange([...sections, createEmptySection()]);
  }

  function addLesson(sectionLocalId: string) {
    onChange(
      sections.map((section) =>
        section.localId === sectionLocalId
          ? { ...section, isExpanded: true, lessons: [...section.lessons, createEmptyLesson()] }
          : section
      )
    );
  }

  function updateLesson(
    sectionLocalId: string,
    lessonLocalId: string,
    patch: Partial<CourseLessonDraft>
  ) {
    onChange(
      sections.map((section) =>
        section.localId === sectionLocalId
          ? {
              ...section,
              lessons: section.lessons.map((lesson) =>
                lesson.localId === lessonLocalId ? { ...lesson, ...patch } : lesson
              ),
            }
          : section
      )
    );
  }

  function removeLesson(sectionLocalId: string, lessonLocalId: string) {
    onChange(
      sections.map((section) =>
        section.localId === sectionLocalId
          ? { ...section, lessons: section.lessons.filter((lesson) => lesson.localId !== lessonLocalId) }
          : section
      )
    );
  }

  function handleSectionDrop(targetSectionId: string) {
    if (!dragState || dragState.type !== "section") {
      return;
    }

    onChange(reorderList(sections, dragState.sectionLocalId, targetSectionId));
    setDragState(null);
  }

  function handleLessonDrop(targetSectionId: string, targetLessonId?: string) {
    if (!dragState || dragState.type !== "lesson") {
      return;
    }

    onChange(
      moveLessonBetweenSections(
        sections,
        dragState.sectionLocalId,
        dragState.lessonLocalId,
        targetSectionId,
        targetLessonId
      )
    );
    setDragState(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-[28px] border border-dashed border-white/10 bg-black/20 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Course Structure</p>
          <p className="mt-1 text-sm text-slate-400">
            Build chapters and lessons, then drag them into the exact learning order you want.
          </p>
        </div>
        <AdminButton type="button" icon={<Plus className="h-4 w-4" />} onClick={addSection}>
          Add Section
        </AdminButton>
      </div>

      {sections.length === 0 ? (
        <AdminCard className="border-dashed p-8 text-center">
          <p className="text-lg font-semibold text-white">No sections yet</p>
          <p className="mt-2 text-sm text-slate-400">
            Add your first chapter to start shaping the curriculum.
          </p>
        </AdminCard>
      ) : (
        sections.map((section, sectionIndex) => {
          const visibleLessonCount = section.lessons.length;

          return (
            <AdminCard
              key={section.localId}
              className="overflow-hidden"
              onDragOver={(event) => {
                if (dragState?.type === "section") {
                  event.preventDefault();
                }
              }}
              onDrop={() => handleSectionDrop(section.localId)}
            >
              <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDragState({ type: "section", sectionLocalId: section.localId })}
                      className="rounded-xl border border-white/10 bg-black/30 p-2 text-slate-400 hover:text-white"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Section {sectionIndex + 1}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {section.title || "Untitled section"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="info">{visibleLessonCount} lessons</StatusPill>
                    <AdminButton type="button" variant="secondary" onClick={() => addLesson(section.localId)}>
                      Add Lesson
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="ghost"
                      icon={section.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      onClick={() => updateSection(section.localId, { isExpanded: !section.isExpanded })}
                    >
                      {section.isExpanded ? "Collapse" : "Expand"}
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="ghost"
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => removeSection(section.localId)}
                    >
                      Remove
                    </AdminButton>
                  </div>
                </div>
              </div>

              {section.isExpanded ? (
                <div className="space-y-5 p-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <FieldLabel>Section Title</FieldLabel>
                      <AdminInput
                        value={section.title}
                        onChange={(event) => updateSection(section.localId, { title: event.target.value })}
                        placeholder="Chapter 1: Foundations"
                      />
                    </div>
                    <div>
                      <FieldLabel>Section Description</FieldLabel>
                      <AdminInput
                        value={section.description}
                        onChange={(event) => updateSection(section.localId, { description: event.target.value })}
                        placeholder="Brief summary of what this chapter covers"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {section.lessons.map((lesson) => {
                      const LessonIcon = getLessonIcon(lesson.type);
                      const lessonOptions = [
                        { label: "Video", value: "VIDEO" },
                        { label: "Audio", value: "AUDIO" },
                        { label: "PDF", value: "PDF" },
                        { label: "Quiz", value: "QUIZ" },
                        { label: "Assignment", value: "ASSIGNMENT" },
                      ];

                      if (!lessonOptions.some((option) => option.value === lesson.type)) {
                        lessonOptions.push({
                          label: `Legacy: ${lesson.type}`,
                          value: lesson.type,
                        });
                      }

                      return (
                        <div
                          key={lesson.localId}
                          className="rounded-[24px] border border-white/10 bg-black/25"
                          onDragOver={(event) => {
                            if (dragState?.type === "lesson") {
                              event.preventDefault();
                            }
                          }}
                          onDrop={() => handleLessonDrop(section.localId, lesson.localId)}
                        >
                          <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                draggable
                                onDragStart={() =>
                                  setDragState({
                                    type: "lesson",
                                    sectionLocalId: section.localId,
                                    lessonLocalId: lesson.localId,
                                  })
                                }
                                className="rounded-xl border border-white/10 bg-black/30 p-2 text-slate-400 hover:text-white"
                              >
                                <GripVertical className="h-4 w-4" />
                              </button>
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                                <LessonIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  {lesson.title || "Untitled lesson"}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <StatusPill tone="info">{normalizeLessonType(lesson.type)}</StatusPill>
                                  {lesson.allowDownload ? <StatusPill tone="success">Downloadable</StatusPill> : null}
                                  {lesson.sellSeparately ? <StatusPill tone="warning">Sell separately</StatusPill> : null}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <AdminButton
                                type="button"
                                variant="ghost"
                                icon={lesson.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                onClick={() =>
                                  updateLesson(section.localId, lesson.localId, {
                                    isExpanded: !lesson.isExpanded,
                                  })
                                }
                              >
                                {lesson.isExpanded ? "Collapse" : "Expand"}
                              </AdminButton>
                              <AdminButton
                                type="button"
                                variant="ghost"
                                icon={<Trash2 className="h-4 w-4" />}
                                onClick={() => removeLesson(section.localId, lesson.localId)}
                              >
                                Remove
                              </AdminButton>
                            </div>
                          </div>

                          {lesson.isExpanded ? (
                            <div className="grid gap-5 p-4 md:grid-cols-2">
                              <div>
                                <FieldLabel>Lesson Title</FieldLabel>
                                <AdminInput
                                  value={lesson.title}
                                  onChange={(event) =>
                                    updateLesson(section.localId, lesson.localId, {
                                      title: event.target.value,
                                    })
                                  }
                                  placeholder="Lesson 1: Introduction"
                                />
                              </div>
                              <div>
                                <FieldLabel>Asset Type</FieldLabel>
                                <AdminSelect
                                  value={lesson.type}
                                  onChange={(event) =>
                                    updateLesson(section.localId, lesson.localId, {
                                      type: event.target.value as CourseLessonDraft["type"],
                                    })
                                  }
                                >
                                  {lessonOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </AdminSelect>
                              </div>
                              <div className="md:col-span-2">
                                <FieldLabel>Description</FieldLabel>
                                <AdminTextarea
                                  rows={3}
                                  value={lesson.description}
                                  onChange={(event) =>
                                    updateLesson(section.localId, lesson.localId, {
                                      description: event.target.value,
                                    })
                                  }
                                  placeholder="Explain what the learner will do in this lesson."
                                />
                              </div>
                              <div>
                                <FieldLabel>Duration (minutes)</FieldLabel>
                                <AdminInput
                                  type="number"
                                  min="0"
                                  value={lesson.durationMinutes}
                                  onChange={(event) =>
                                    updateLesson(section.localId, lesson.localId, {
                                      durationMinutes: event.target.value,
                                    })
                                  }
                                  placeholder="12"
                                />
                              </div>
                              <div className="grid gap-3">
                                <AdminSwitch
                                  checked={lesson.isPreview}
                                  onChange={(value) =>
                                    updateLesson(section.localId, lesson.localId, { isPreview: value })
                                  }
                                  label="Preview lesson"
                                  hint="Allow prospective learners to preview this lesson."
                                />
                              </div>

                              {lesson.type === "QUIZ" ? null : (
                                <div className="md:col-span-2">
                                  {courseId ? (
                                    <MediaUploader
                                      label="Lesson Asset"
                                      hint="Upload the primary video, audio, PDF, or assignment file for this lesson."
                                      folder={`courses/lessons/${courseId}`}
                                      accept={
                                        lesson.type === "VIDEO"
                                          ? "video/*"
                                          : lesson.type === "AUDIO"
                                            ? "audio/*"
                                            : lesson.type === "PDF"
                                              ? "application/pdf"
                                              : ".pdf,.doc,.docx,.zip,.ppt,.pptx"
                                      }
                                      value={{
                                        url: lesson.assetUrl,
                                        path: lesson.assetPath,
                                        fileName: lesson.title || "Lesson asset",
                                        mimeType:
                                          lesson.type === "VIDEO"
                                            ? "video/*"
                                            : lesson.type === "AUDIO"
                                              ? "audio/*"
                                              : lesson.type === "PDF"
                                                ? "application/pdf"
                                                : undefined,
                                      }}
                                      onUploaded={(file: UploadedAsset) =>
                                        updateLesson(section.localId, lesson.localId, {
                                          assetUrl: file.url,
                                          assetPath: file.path,
                                        })
                                      }
                                      onRemoved={() =>
                                        updateLesson(section.localId, lesson.localId, {
                                          assetUrl: "",
                                          assetPath: "",
                                        })
                                      }
                                    />
                                  ) : (
                                    <AdminCard className="border-dashed p-5">
                                      <p className="text-sm font-semibold text-white">
                                        Save the course first to unlock uploads
                                      </p>
                                      <p className="mt-2 text-sm text-slate-400">
                                        You can still outline the curriculum now, then upload lesson assets after the
                                        initial save.
                                      </p>
                                    </AdminCard>
                                  )}
                                </div>
                              )}

                              <div className="md:col-span-2">
                                <FieldLabel>
                                  {lesson.type === "QUIZ"
                                    ? "Quiz Instructions"
                                    : lesson.type === "ASSIGNMENT" || lesson.type === "PROJECT"
                                      ? "Assignment Brief"
                                      : "Lesson Notes"}
                                </FieldLabel>
                                <AdminTextarea
                                  rows={4}
                                  value={lesson.content}
                                  onChange={(event) =>
                                    updateLesson(section.localId, lesson.localId, {
                                      content: event.target.value,
                                    })
                                  }
                                  placeholder="Add learner instructions, embedded notes, or quiz prompts."
                                />
                              </div>

                              <div className="md:col-span-2 grid gap-3 lg:grid-cols-2">
                                <AdminCheckbox
                                  checked={lesson.allowDownload}
                                  onChange={(value) =>
                                    updateLesson(section.localId, lesson.localId, {
                                      allowDownload: value,
                                    })
                                  }
                                  label="Allow Download"
                                  hint="Keep files locked to the platform by leaving this off."
                                />
                                <AdminCheckbox
                                  checked={lesson.sellSeparately}
                                  onChange={(value) =>
                                    updateLesson(section.localId, lesson.localId, {
                                      sellSeparately: value,
                                    })
                                  }
                                  label="Sell Separately"
                                  hint="Flag this lesson for future chapter-by-chapter commerce."
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    <div
                      className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400"
                      onDragOver={(event) => {
                        if (dragState?.type === "lesson") {
                          event.preventDefault();
                        }
                      }}
                      onDrop={() => handleLessonDrop(section.localId)}
                    >
                      Drop a lesson here to move it to the end of this section.
                    </div>
                  </div>
                </div>
              ) : null}
            </AdminCard>
          );
        })
      )}
    </div>
  );
}
