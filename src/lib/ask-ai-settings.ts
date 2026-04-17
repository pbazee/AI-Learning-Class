import "server-only";

import { DEFAULT_ASK_AI_NAME } from "@/lib/site";
import { prisma } from "@/lib/prisma";

export type AskAiSettings = {
  enabled: boolean;
  assistantLabel: string;
  systemPrompt: string;
};

function readSocialLinks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, String(entryValue ?? "")])
  );
}

export async function getAskAiSettings(): Promise<AskAiSettings> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: {
      socialLinks: true,
    },
  });

  const socialLinks = readSocialLinks(settings?.socialLinks);

  return {
    enabled: socialLinks.askAiEnabled !== "false",
    assistantLabel: socialLinks.askAiAssistantLabel?.trim() || DEFAULT_ASK_AI_NAME,
    systemPrompt: socialLinks.askAiSystemPrompt?.trim() || "",
  };
}
