"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnnouncementBar } from "./AnnouncementBar";

export function AnnouncementBarWrapper() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      document.documentElement.style.setProperty("--announcement-height", "0px");
    }
  }, [pathname]);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return <AnnouncementBar />;
}
