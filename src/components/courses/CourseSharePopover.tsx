"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Facebook, Linkedin, MessageCircle, Share2, X } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.9 2H22l-6.77 7.74L23 22h-6.09l-4.77-6.24L6.68 22H3.57l7.24-8.27L1 2h6.25l4.31 5.7L18.9 2Zm-1.07 18.17h1.72L6.31 3.74H4.46l13.37 16.43Z" />
    </svg>
  );
}

export function CourseSharePopover({
  shareUrl,
  title,
  className = "",
}: {
  shareUrl: string;
  title: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { success, error } = useToast();

  const shareLinks = useMemo(() => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);
    const whatsappText = encodeURIComponent(`Check out this course: ${title} ${shareUrl}`);

    return [
      {
        label: "WhatsApp",
        href: `https://wa.me/?text=${whatsappText}`,
        icon: MessageCircle,
      },
      {
        label: "Facebook",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        icon: Facebook,
      },
      {
        label: "X",
        href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
        icon: XIcon,
      },
      {
        label: "LinkedIn",
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        icon: Linkedin,
      },
    ];
  }, [shareUrl, title]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      success("Copied!", 2000);
    } catch {
      error("Unable to copy the link right now.", 2000);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-400"
        aria-expanded={open}
        aria-label="Share this course"
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>

      {open ? (
        <div className="absolute left-0 top-auto z-[120] mt-0 w-72 max-w-[calc(100vw-32px)] rounded-2xl border border-border bg-card p-3 shadow-2xl max-sm:bottom-full max-sm:mb-3 sm:left-auto sm:right-0 sm:top-full sm:mt-3">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <p className="text-sm font-semibold text-foreground">Share this course</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close share menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-2">
            {shareLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all hover:border-blue-300 hover:text-blue-600"
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </a>
              );
            })}

            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all hover:border-blue-300 hover:text-blue-600"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
