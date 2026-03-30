import { prisma } from "@/lib/prisma";
import { AnnouncementsManager } from "@/components/admin/announcements-manager";

export default async function AdminAnnouncementsPage() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <AnnouncementsManager
      announcements={announcements.map((announcement) => ({
        id: announcement.id,
        text: announcement.text,
        link: announcement.link,
        linkText: announcement.linkText,
        bgColor: announcement.bgColor,
        startsAt: announcement.startsAt?.toISOString().slice(0, 10),
        endsAt: announcement.endsAt?.toISOString().slice(0, 10),
        isActive: announcement.isActive,
      }))}
    />
  );
}
