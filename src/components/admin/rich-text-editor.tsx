"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Bold, Heading2, Italic, Link2, List, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-xl border border-border bg-background p-2 text-muted-foreground hover:border-blue-300 hover:text-foreground"
    >
      {children}
    </button>
  );
}

export type RichTextEditorHandle = {
  focus: () => void;
  getSelectedText: () => string;
  replaceSelection: (value: string) => void;
};

export const RichTextEditor = forwardRef<
  RichTextEditorHandle,
  {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    toolbarExtras?: React.ReactNode;
  }
>(function RichTextEditor({ value, onChange, className, toolbarExtras }, ref) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "<p></p>";
    }
  }, [value]);

  function syncContent() {
    onChange(editorRef.current?.innerHTML || "");
  }

  function saveSelection() {
    const selection = window.getSelection();
    const editor = editorRef.current;

    if (!selection || !editor || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }

    savedRangeRef.current = range.cloneRange();
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) {
      return null;
    }

    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current.cloneRange());
    return selection;
  }

  function run(command: string, commandValue?: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    syncContent();
  }

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editorRef.current?.focus();
      },
      getSelectedText: () => savedRangeRef.current?.toString().trim() || "",
      replaceSelection: (replacement) => {
        const editor = editorRef.current;
        if (!editor) {
          return;
        }

        editor.focus();
        const selection = restoreSelection();
        const activeSelection = selection && selection.rangeCount > 0 ? selection : window.getSelection();

        if (!activeSelection || activeSelection.rangeCount === 0) {
          return;
        }

        const range = activeSelection.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) {
          return;
        }

        range.deleteContents();
        const fragment = range.createContextualFragment(replacement);
        const lastNode = fragment.lastChild;
        range.insertNode(fragment);

        if (lastNode) {
          const nextRange = document.createRange();
          nextRange.setStartAfter(lastNode);
          nextRange.collapse(true);
          activeSelection.removeAllRanges();
          activeSelection.addRange(nextRange);
          savedRangeRef.current = nextRange.cloneRange();
        }

        syncContent();
      },
    }),
    []
  );

  return (
    <div className={cn("overflow-hidden rounded-3xl border border-input bg-background", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 p-3">
        <div className="flex flex-wrap gap-2">
          <ToolbarButton title="Bold" onClick={() => run("bold")}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Italic" onClick={() => run("italic")}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Heading" onClick={() => run("formatBlock", "<h2>")}>
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Bulleted list" onClick={() => run("insertUnorderedList")}>
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="Quote" onClick={() => run("formatBlock", "<blockquote>")}>
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Insert link"
            onClick={() => {
              const url = window.prompt("Enter a URL");
              if (url) {
                run("createLink", url);
              }
            }}
          >
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
        </div>
        {toolbarExtras ? <div className="flex flex-wrap gap-2">{toolbarExtras}</div> : null}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncContent}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onBlur={saveSelection}
        className="prose prose-sm max-w-none min-h-[260px] px-5 py-4 outline-none"
      />
    </div>
  );
});
