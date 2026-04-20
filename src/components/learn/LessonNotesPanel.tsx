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
    if (typeof window !== "undefined") {
      setPosition({
        x: window.innerWidth - 440,
        y: 100
      });
    }
  }, []);

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
    setPosition(prev => ({
      x: Math.max(0, Math.min(window.innerWidth - size.width, prev.x + info.offset.x)),
      y: Math.max(0, Math.min(window.innerHeight - 100, prev.y + info.offset.y))
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
    const newHeight = Math.max(300, Math.min(window.innerHeight - position.y - 20, resizeStartRef.current.h + deltaY));
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
          drag={!isResizing}
          dragMomentum={false}
          dragControls={dragControls}
          onDragEnd={onDragEnd}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
            width: size.width,
            height: size.height,
            zIndex: 100,
          }}
          className="flex flex-col rounded-2xl border border-white/10 bg-[#04070d]/95 shadow-2xl backdrop-blur-md overflow-hidden"
        >
          {/* Header / Drag Area */}
          <div 
            onPointerDown={(e) => dragControls.start(e)}
            className="flex items-center justify-between border-b border-white/5 p-3 cursor-move bg-white/[0.02]"
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
          <div
            onPointerDown={startResizing}
            onPointerMove={handlePointerResize}
            onPointerUp={stopResizing}
            className="absolute bottom-0 right-0 h-8 w-8 cursor-nwse-resize flex items-end justify-end p-1 group hover:bg-primary-blue/10 transition-colors rounded-tl"
            title="Drag to resize"
          >
            <div className="h-2 w-2 rounded-full bg-slate-500 group-hover:bg-primary-blue transition-colors mb-1 mr-1" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
