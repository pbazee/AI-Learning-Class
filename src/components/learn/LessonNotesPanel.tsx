"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X, Save, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface LessonNotesPanelProps {
  lessonId: string;
  viewerId: string | null;
  initialContent?: string;
  content?: string;
  isOpen: boolean;
  onClose: () => void;
  onContentChange?: (content: string) => void;
  isSaving?: boolean;
  variant?: "floating" | "embedded";
  className?: string;
}

export function LessonNotesPanel({
  lessonId,
  viewerId,
  initialContent = "",
  content: controlledContent,
  isOpen,
  onClose,
  onContentChange,
  isSaving: externalIsSaving,
  variant = "floating",
  className,
}: LessonNotesPanelProps) {
  const [internalContent, setInternalContent] = useState(initialContent);
  const [isSavingInternal, setIsSavingInternal] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Floating State
  const [position, setPosition] = useState({ x: 0, y: 100 });
  const [size, setSize] = useState({ width: 400, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  
  const dragControls = useDragControls();
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const content = controlledContent ?? internalContent;
  const isSaving = externalIsSaving ?? isSavingInternal;

  const updateContent = useCallback(
    (value: string) => {
      if (typeof controlledContent === "undefined") {
        setInternalContent(value);
      }
      onContentChange?.(value);
    },
    [controlledContent, onContentChange]
  );

  useEffect(() => {
    if (typeof controlledContent === "undefined") {
      setInternalContent(initialContent);
    }
  }, [controlledContent, initialContent]);

  // Set initial position to the right side of the screen on mount
  useEffect(() => {
    if (typeof window === "undefined" || variant !== "floating") {
      return;
    }

    setPosition({
      x: Math.max(16, window.innerWidth - 440),
      y: 100,
    });
  }, [variant]);

  useEffect(() => {
    if (typeof window === "undefined" || variant !== "floating" || !isOpen) {
      return;
    }

    setPosition((current) => ({
      x: Math.max(16, Math.min(window.innerWidth - size.width - 16, current.x)),
      y: Math.max(16, Math.min(window.innerHeight - size.height - 16, current.y)),
    }));
  }, [isOpen, size.height, size.width, variant]);

  const saveNotes = useCallback(async () => {
    if (!viewerId) return;

    setIsSavingInternal(true);
    try {
      const response = await fetch(`/api/learn/lessons/${lessonId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (response.ok) {
        setLastSaved(new Date().toLocaleTimeString());
      } else {
        console.error("Failed to save notes");
      }
    } catch (error) {
      console.error("Error saving notes:", error);
    } finally {
      setIsSavingInternal(false);
    }
  }, [content, lessonId, viewerId]);

  const handleSave = () => {
    void saveNotes();
  };

  // Drag and Resize Handlers
  const onDragEnd = (_: any, info: { point: { x: number, y: number }, offset: { x: number, y: number } }) => {
    if (typeof window === "undefined") {
      return;
    }

    setPosition((prev) => ({
      x: Math.max(16, Math.min(window.innerWidth - size.width - 16, prev.x + info.offset.x)),
      y: Math.max(16, Math.min(window.innerHeight - size.height - 16, prev.y + info.offset.y)),
    }));
  };

  const startResizing = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerResize = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    const newWidth = Math.max(320, Math.min(800, resizeStartRef.current.w + deltaX));
    const newHeight = Math.max(
      300,
      Math.min(window.innerHeight - position.y - 16, resizeStartRef.current.h + deltaY)
    );
    setSize({ width: newWidth, height: newHeight });
  };

  const stopResizing = (e: React.PointerEvent) => {
    setIsResizing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          drag={variant === "floating" && !isResizing}
          dragMomentum={false}
          dragControls={dragControls}
          onDragEnd={onDragEnd}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{
            position: variant === "floating" ? "fixed" : "relative",
            left: variant === "floating" ? position.x : undefined,
            top: variant === "floating" ? position.y : undefined,
            width: variant === "floating" ? size.width : "100%",
            height: variant === "floating" ? size.height : "100%",
            zIndex: variant === "floating" ? 170 : undefined,
          }}
          className={cn(
            "flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#04070d]/95 shadow-2xl backdrop-blur-md",
            className
          )}
        >
          {/* Header / Drag Area */}
          <div 
            onPointerDown={(e) => {
              if (variant === "floating") {
                dragControls.start(e);
              }
            }}
            className={cn(
              "flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-3",
              variant === "floating" ? "cursor-move" : ""
            )}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-bold text-white select-none">Notes</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden p-3 pt-4">
            <textarea
              value={content}
              onChange={(e) => updateContent(e.target.value)}
              placeholder="Jot down your insights..."
              className="h-full w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder-slate-500 focus:border-primary-blue/50 focus:outline-none focus:ring-1 focus:ring-primary-blue/30 custom-scrollbar"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.01] p-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Status</span>
              <div className="text-[10px] text-slate-400">
                {isSaving ? "Saving..." : lastSaved ? `Last saved ${lastSaved}` : "Changes not saved"}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving || !content.trim()}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                  isSaving || !content.trim()
                    ? "cursor-not-allowed bg-white/5 text-slate-600"
                    : "bg-primary-blue text-white hover:bg-primary-blue/90 shadow-lg shadow-primary-blue/20"
                )}
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save
              </button>
            </div>
          </div>

          {/* Resize Handle */}
          {variant === "floating" ? (
            <div
              onPointerDown={startResizing}
              onPointerMove={handlePointerResize}
              onPointerUp={stopResizing}
              className="group absolute bottom-0 right-0 flex h-8 w-8 cursor-nwse-resize items-end justify-end rounded-tl p-1 transition-colors hover:bg-primary-blue/10"
              title="Drag to resize"
            >
              <div className="mb-1 mr-1 h-2 w-2 rounded-full bg-slate-500 transition-colors group-hover:bg-primary-blue" />
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
