"use client";

import { useState } from "react";
import Link from "next/link";
import { NotebookText, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

type WorkspaceNote = {
  id: string;
  content: string;
  timestamp: string;
  lessonId: string;
  lessonTitle: string;
  courseSlug: string;
  courseTitle: string;
};

export function WorkspaceNotesPanel({ notes: initialNotes }: { notes: WorkspaceNote[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleDelete(noteId: string, lessonId: string) {
    const confirmed = window.confirm("Delete this saved note?");
    if (!confirmed) {
      return;
    }

    setDeletingNoteId(noteId);

    try {
      const response = await fetch(`/api/learn/lessons/${lessonId}/notes/${noteId}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to delete this note right now.");
      }

      setNotes((current) => current.filter((note) => note.id !== noteId));
      toast("Note deleted.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to delete this note right now.", "error");
    } finally {
      setDeletingNoteId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div id="workspace-notes" className="mb-4 flex items-center gap-2">
        <NotebookText className="h-4 w-4 text-primary-blue" />
        <h2 className="text-sm font-bold text-foreground">My workspace notes</h2>
      </div>

      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Saved lesson-note snapshots will appear here as you study.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group rounded-xl border border-border p-3 transition-colors hover:border-primary-blue/20 hover:bg-primary-blue/5"
            >
              <div className="flex items-start justify-between gap-3">
                <Link href={`/learn/${note.courseSlug}/${note.lessonId}`} className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-blue">
                    {note.courseTitle}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-foreground">{note.lessonTitle}</p>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                    {note.content}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(note.timestamp))}
                  </p>
                </Link>

                <button
                  type="button"
                  onClick={() => void handleDelete(note.id, note.lessonId)}
                  disabled={deletingNoteId === note.id}
                  className="rounded-lg p-2 text-slate-400 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
                  aria-label="Delete note"
                  title="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
