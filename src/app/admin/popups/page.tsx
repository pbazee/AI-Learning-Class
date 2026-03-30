import { prisma } from "@/lib/prisma";
import { PopupsManager } from "@/components/admin/popups-manager";

export default async function AdminPopupsPage() {
  const popups = await prisma.popup.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <PopupsManager
      popups={popups.map((popup) => ({
        id: popup.id,
        title: popup.title,
        content: popup.content,
        imageUrl: popup.imageUrl,
        imagePath: popup.imagePath,
        buttonText: popup.buttonText,
        link: popup.link,
        showOn: popup.showOn,
        delaySeconds: popup.delaySeconds,
        startsAt: popup.startsAt?.toISOString().slice(0, 16),
        endsAt: popup.endsAt?.toISOString().slice(0, 16),
        isActive: popup.isActive,
      }))}
    />
  );
}
