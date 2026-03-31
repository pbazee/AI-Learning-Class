"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Announcement } from "@/types";

const DISMISS_KEY = "alc-announcements-dismissed";

export function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (dismissed === "1") {
        setVisible(false);
      }
    } catch {
      // no-op when sessionStorage is unavailable
    }
  }, []);

  useEffect(() => {
    fetch("/api/announcements?active=true&status=active")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setAnnouncements(data);
        } else {
          setAnnouncements([]);
        }
      })
      .catch(() => setAnnouncements([]));
  }, []);

  const activeAnnouncements = useMemo(
    () => announcements.filter((announcement) => announcement.isActive),
    [announcements]
  );

  useEffect(() => {
    if (activeAnnouncements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeAnnouncements.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeAnnouncements.length]);

  useEffect(() => {
    if (!visible || activeAnnouncements.length === 0) {
      document.documentElement.style.setProperty("--announcement-height", "0px");
      return;
    }

    const updateHeight = () => {
      const nextHeight = barRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty("--announcement-height", `${nextHeight}px`);
    };

    updateHeight();
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateHeight())
        : null;

    if (barRef.current && resizeObserver) {
      resizeObserver.observe(barRef.current);
    }

    return () => {
      resizeObserver?.disconnect();
      document.documentElement.style.setProperty("--announcement-height", "0px");
    };
  }, [activeAnnouncements.length, current, visible]);

  if (!visible || activeAnnouncements.length === 0) return null;
  const ann = activeAnnouncements[current];

  return (
    <div
      ref={barRef}
      className="sticky top-0 z-[110] overflow-hidden text-white shadow-[0_16px_30px_-28px_rgba(15,23,42,0.85)]"
      style={{ backgroundColor: ann.bgColor || "#1d4ed8" }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08),transparent,rgba(255,255,255,0.08))]" />
      <div className="relative mx-auto flex min-h-10 max-w-7xl items-center justify-center gap-2 px-6 py-1.5 sm:px-8">
        {activeAnnouncements.length > 1 && (
          <button
            onClick={() => setCurrent((p) => (p - 1 + activeAnnouncements.length) % activeAnnouncements.length)}
            className="shrink-0 rounded-full bg-white/10 p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}

        <p className="truncate text-center text-[11px] font-semibold tracking-[0.02em] text-white sm:text-[13px]">
          {ann.text}
          {ann.link && ann.linkText && (
            <Link
              href={ann.link}
              className="ml-2 inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 font-semibold text-white underline underline-offset-2 hover:bg-white/20"
            >
              {ann.linkText} {"->"}
            </Link>
          )}
        </p>

        {activeAnnouncements.length > 1 && (
          <button
            onClick={() => setCurrent((p) => (p + 1) % activeAnnouncements.length)}
            className="shrink-0 rounded-full bg-white/10 p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          onClick={() => {
            setVisible(false);
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // no-op
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white sm:right-3"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
