"use client";

import { usePathname } from "next/navigation";

export function AppChrome({
  announcementBar,
  mobileBottomNav,
  navbar,
  popupCampaigns,
}: {
  announcementBar: React.ReactNode;
  mobileBottomNav: React.ReactNode;
  navbar: React.ReactNode;
  popupCampaigns: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return null;
  }

  return (
    <>
      {announcementBar}
      {popupCampaigns}
      {navbar}
      {mobileBottomNav}
    </>
  );
}
