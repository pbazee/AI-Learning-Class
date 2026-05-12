import "server-only";

import { DEFAULT_ASK_AI_NAME } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { isPrismaConnectionError, isPrismaSchemaMismatchError, logPrismaConnectionEvent } from "@/lib/prisma-errors";

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
  try {
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
  } catch (error) {
    if (!isPrismaConnectionError(error) && !isPrismaSchemaMismatchError(error)) {
      throw error;
    }

    logPrismaConnectionEvent(
      "ask-ai-settings:getAskAiSettings",
      "[getAskAiSettings] Failed to fetch settings. Falling back to defaults.",
      error,
      "warn"
    );

    return {
      enabled: true,
      assistantLabel: DEFAULT_ASK_AI_NAME,
      systemPrompt: "",
    };
  }
}
