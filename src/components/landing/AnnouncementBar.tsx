"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Announcement } from "@/types";

export function AnnouncementBar({ announcements }: { announcements: Announcement[] }) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const activeAnnouncements = announcements.filter((announcement) => announcement.isActive);

  useEffect(() => {
    if (activeAnnouncements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeAnnouncements.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeAnnouncements.length]);

  if (!visible || activeAnnouncements.length === 0) return null;
  const ann = activeAnnouncements[current];

  return (
    <div className="announcement-gradient relative z-40 overflow-hidden">
      <div className="mx-auto flex h-11 max-w-7xl items-center justify-center gap-4 px-4">
        {activeAnnouncements.length > 1 && (
          <button
            onClick={() => setCurrent((p) => (p - 1 + activeAnnouncements.length) % activeAnnouncements.length)}
            className="shrink-0 text-white/60 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <p className="truncate text-center text-xs font-medium text-white sm:text-sm">
          {ann.text}
          {ann.link && ann.linkText && (
            <Link href={ann.link} className="ml-2 font-semibold underline underline-offset-2 hover:opacity-80">
              {ann.linkText} {"->"}
            </Link>
          )}
        </p>

        {activeAnnouncements.length > 1 && (
          <button
            onClick={() => setCurrent((p) => (p + 1) % activeAnnouncements.length)}
            className="shrink-0 text-white/60 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={() => setVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
