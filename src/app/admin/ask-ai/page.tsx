import { AskAiManager } from "@/components/admin/ask-ai-manager";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ASK_AI_NAME, DEFAULT_SITE_NAME } from "@/lib/site";
import { ensureSubscriptionPlansTable } from "@/lib/subscription-plans";

function readSocialLinks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, String(entryValue ?? "")])
  );
}

export default async function AdminAskAiPage() {
  await ensureSubscriptionPlansTable();

  const [settings, plans] = await Promise.all([
    prisma.siteSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: {
        id: "singleton",
        siteName: DEFAULT_SITE_NAME,
      },
    }),
    prisma.subscriptionPlan.findMany({
      orderBy: [{ price: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const socialLinks = readSocialLinks(settings.socialLinks);

  return (
    <AskAiManager
      initialSettings={{
        enabled: socialLinks.askAiEnabled !== "false",
        assistantLabel: socialLinks.askAiAssistantLabel || DEFAULT_ASK_AI_NAME,
        systemPrompt: socialLinks.askAiSystemPrompt || "",
      }}
      plans={plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        price: plan.price,
        yearlyPrice: plan.yearlyPrice,
        currency: plan.currency,
        askAiLimit: plan.askAiLimit,
        isActive: plan.isActive,
      }))}
    />
  );
}
