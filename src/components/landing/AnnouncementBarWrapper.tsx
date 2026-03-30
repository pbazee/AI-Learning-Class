"use client";

import { useEffect, useState } from "react";
import { AnnouncementBar } from "./AnnouncementBar";
import type { Announcement } from "@/types";

export function AnnouncementBarWrapper() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetch("/api/announcements")
      .then((res) => res.json())
      .then((data) => setAnnouncements(data))
      .catch(() => {});
  }, []);

  return <AnnouncementBar announcements={announcements} />;
}
