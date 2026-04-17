import { prisma } from "@/lib/prisma";
import { SettingsManager } from "@/components/admin/settings-manager";
import { DEFAULT_SITE_NAME, normalizeSiteName } from "@/lib/site";

export default async function AdminSettingsPage() {
  const [settings, faqs] = await Promise.all([
    prisma.siteSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: {
        id: "singleton",
        siteName: DEFAULT_SITE_NAME,
      },
    }),
    prisma.fAQ.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <SettingsManager
      initialSettings={{
        siteName: normalizeSiteName(settings.siteName),
        logoUrl: settings.logoUrl || "",
        logoPath:
          settings.socialLinks && typeof settings.socialLinks === "object" && !Array.isArray(settings.socialLinks)
            ? String((settings.socialLinks as Record<string, unknown>).brandLogoPath ?? "")
            : "",
        faviconUrl: settings.faviconUrl || "",
        faviconPath:
          settings.socialLinks && typeof settings.socialLinks === "object" && !Array.isArray(settings.socialLinks)
            ? String((settings.socialLinks as Record<string, unknown>).brandFaviconPath ?? "")
            : "",
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
