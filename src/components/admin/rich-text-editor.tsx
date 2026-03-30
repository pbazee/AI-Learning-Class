"use client";

import { useEffect, useRef } from "react";
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

export function RichTextEditor({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "<p></p>";
    }
  }, [value]);

  function run(command: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || "");
  }

  return (
    <div className={cn("overflow-hidden rounded-3xl border border-input bg-background", className)}>
      <div className="flex flex-wrap gap-2 border-b border-border bg-muted/40 p-3">
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
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || "")}
        className="prose prose-sm max-w-none min-h-[260px] px-5 py-4 outline-none"
      />
    </div>
  );
}
