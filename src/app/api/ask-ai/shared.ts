import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { NextRequest, NextResponse } from "next/server";
import { getAskAiSettings } from "@/lib/ask-ai-settings";
import { getUserAskAiQuota, incrementUserAskAiUsage } from "@/lib/ask-ai-usage";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import { env } from "@/lib/config";

function buildSystemPrompt(courseTitle: string, systemPrompt?: string) {
  const basePrompt = `You are the Ask AI learning assistant for the course: "${courseTitle}".
Your role is to:
- Answer questions about course concepts clearly and thoroughly
- Generate practice exercises and coding challenges
- Explain complex topics in simple terms with analogies
- Create quizzes to test understanding
- Suggest related resources and next steps
- Motivate and guide the student's learning journey

Be concise but thorough. Use markdown for code blocks and structure. Keep responses focused and actionable.`;

  if (!systemPrompt?.trim()) {
    return basePrompt;
  }

  return `${basePrompt}\n\nAdditional platform instructions:\n${systemPrompt.trim()}`;
}

function toChatMessages(
  messages: Array<{ role: string; content: string }> | undefined,
  courseTitle: string,
  systemPrompt?: string
): ChatCompletionMessageParam[] {
  const history = Array.isArray(messages) ? messages.slice(-10) : [];

  return [
    {
      role: "system",
      content: buildSystemPrompt(courseTitle, systemPrompt),
    },
    ...history.map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    })) as ChatCompletionMessageParam[],
  ];
}

async function getAuthenticatedDbUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return syncAuthenticatedUser(user);
}

export async function GET() {
  try {
    const askAiSettings = await getAskAiSettings();

    if (!askAiSettings.enabled) {
      return NextResponse.json({ error: "Ask AI is currently disabled." }, { status: 403 });
    }

    const dbUser = await getAuthenticatedDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Please sign in to use Ask AI." }, { status: 401 });
    }

    const quota = await getUserAskAiQuota(dbUser.id);
    return NextResponse.json({ quota });
  } catch (error) {
    console.error("[ask-ai.quota] Unable to load Ask AI quota.", error);
    return NextResponse.json({ error: "Unable to load your Ask AI quota right now." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const askAiSettings = await getAskAiSettings();

    if (!askAiSettings.enabled) {
      return NextResponse.json(
        { content: "Ask AI is currently disabled.", quota: null },
        { status: 403 }
      );
    }

    const dbUser = await getAuthenticatedDbUser();

    if (!dbUser) {
      return NextResponse.json(
        { content: "Please sign in to use Ask AI.", quota: null },
        { status: 401 }
      );
    }

    const { messages, courseTitle } = await req.json();
    const quota = await getUserAskAiQuota(dbUser.id);

    if (quota.remaining <= 0) {
      return NextResponse.json(
        {
          content: `You have used all ${quota.limit} Ask AI requests for the ${quota.planName} plan this month.`,
          quota,
        },
        { status: 429 }
      );
    }

    if (!env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          content: "Ask AI is temporarily unavailable. Please configure OPENAI_API_KEY on the server.",
          quota,
        },
        { status: 200 }
      );
    }

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: env.OPENAI_ASK_AI_MODEL || env.OPENAI_COPILOT_MODEL || "gpt-4o",
      temperature: 0.6,
      max_tokens: 900,
      messages: toChatMessages(messages, courseTitle, askAiSettings.systemPrompt),
    });

    const content =
      response.choices[0]?.message?.content?.trim() ||
      "I couldn't generate a response. Please try again.";

    await incrementUserAskAiUsage(dbUser.id, quota.monthKey);
    const nextQuota = await getUserAskAiQuota(dbUser.id);

    return NextResponse.json({ content, quota: nextQuota });
  } catch (error) {
    console.error("[ask-ai] Ask AI API error:", error);
    return NextResponse.json(
      {
        content: "Ask AI is temporarily unavailable. Please try again in a moment.",
        quota: null,
      },
      { status: 200 }
    );
  }
}
