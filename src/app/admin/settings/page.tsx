import { prisma } from "@/lib/prisma";
import { SettingsManager } from "@/components/admin/settings-manager";

export default async function AdminSettingsPage() {
  const [settings, faqs] = await Promise.all([
    prisma.siteSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: {
        id: "singleton",
        siteName: "AI Learning Class",
      },
    }),
    prisma.fAQ.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <SettingsManager
      initialSettings={{
        siteName: settings.siteName,
        supportEmail: settings.supportEmail || "",
        supportPhone: settings.supportPhone || "",
        adminEmail: settings.adminEmail || "",
        supportAddress: settings.supportAddress || "",
        maintenanceMode: settings.maintenanceMode,
        socialLinks:
          settings.socialLinks && typeof settings.socialLinks === "object" && !Array.isArray(settings.socialLinks)
            ? Object.fromEntries(Object.entries(settings.socialLinks).map(([key, value]) => [key, String(value)]))
            : {},
      }}
      faqs={faqs.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        sortOrder: faq.sortOrder,
        isActive: faq.isActive,
      }))}
    />
  );
}
