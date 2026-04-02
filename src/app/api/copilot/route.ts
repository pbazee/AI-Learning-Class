import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { NextRequest, NextResponse } from "next/server";
import { getUserCopilotQuota, incrementUserCopilotUsage } from "@/lib/copilot-usage";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";

function buildSystemPrompt(courseTitle: string) {
  return `You are an expert AI learning copilot for the course: "${courseTitle}".
Your role is to:
- Answer questions about course concepts clearly and thoroughly
- Generate practice exercises and coding challenges
- Explain complex topics in simple terms with analogies
- Create quizzes to test understanding
- Suggest related resources and next steps
- Motivate and guide the student's learning journey

Be concise but thorough. Use markdown for code blocks and structure. Keep responses focused and actionable.`;
}

function toChatMessages(
  messages: Array<{ role: string; content: string }> | undefined,
  courseTitle: string
): ChatCompletionMessageParam[] {
  const history = Array.isArray(messages) ? messages.slice(-10) : [];

  return [
    {
      role: "system",
      content: buildSystemPrompt(courseTitle),
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
    const dbUser = await getAuthenticatedDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Please sign in to use AI Copilot." }, { status: 401 });
    }

    const quota = await getUserCopilotQuota(dbUser.id);
    return NextResponse.json({ quota });
  } catch (error) {
    console.error("[copilot.quota] Unable to load copilot quota.", error);
    return NextResponse.json({ error: "Unable to load your AI Copilot quota right now." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const dbUser = await getAuthenticatedDbUser();

    if (!dbUser) {
      return NextResponse.json(
        { content: "Please sign in to use AI Copilot.", quota: null },
        { status: 401 }
      );
    }

    const { messages, courseTitle } = await req.json();
    const quota = await getUserCopilotQuota(dbUser.id);

    if (quota.remaining <= 0) {
      return NextResponse.json(
        {
          content: `You have used all ${quota.limit} AI Copilot requests for the ${quota.planName} plan this month.`,
          quota,
        },
        { status: 429 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          content: "AI Copilot is temporarily unavailable. Please configure OPENAI_API_KEY on the server.",
          quota,
        },
        { status: 200 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_COPILOT_MODEL || "gpt-4o",
      temperature: 0.6,
      max_tokens: 900,
      messages: toChatMessages(messages, courseTitle),
    });

    const content =
      response.choices[0]?.message?.content?.trim() ||
      "I couldn't generate a response. Please try again.";

    await incrementUserCopilotUsage(dbUser.id, quota.monthKey);
    const nextQuota = await getUserCopilotQuota(dbUser.id);

    return NextResponse.json({ content, quota: nextQuota });
  } catch (error) {
    console.error("[copilot] Copilot API error:", error);
    return NextResponse.json(
      {
        content: "AI Copilot is temporarily unavailable. Please try again in a moment.",
        quota: null,
      },
      { status: 200 }
    );
  }
}
