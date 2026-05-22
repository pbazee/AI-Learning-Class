import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getAskAiSettings } from "@/lib/ask-ai-settings";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import { env } from "@/lib/config";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type BlogAiAction =
  | "titleIdeas"
  | "metaDescription"
  | "expandSection"
  | "improveReadability"
  | "suggestTags";

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function getAuthenticatedAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const dbUser = await syncAuthenticatedUser(user);
  if (!dbUser || !["ADMIN", "SUPER_ADMIN", "INSTRUCTOR"].includes(dbUser.role)) {
    return null;
  }

  return dbUser;
}

function buildUserPrompt(input: {
  action: BlogAiAction;
  title?: string;
  excerpt?: string;
  content?: string;
  focusKeyword?: string;
  metaTitle?: string;
  metaDescription?: string;
  selection?: string;
}) {
  const title = input.title?.trim() || "Untitled draft";
  const excerpt = input.excerpt?.trim() || "No excerpt provided.";
  const content = stripHtml(input.content || "");
  const focusKeyword = input.focusKeyword?.trim() || "No focus keyword set";
  const metaTitle = input.metaTitle?.trim() || "No meta title set";
  const metaDescription = input.metaDescription?.trim() || "No meta description set";
  const selection = stripHtml(input.selection || "");

  const sharedContext = `
Post title: ${title}
Excerpt: ${excerpt}
Focus keyword: ${focusKeyword}
Current meta title: ${metaTitle}
Current meta description: ${metaDescription}
Draft content: ${content}
Selected text: ${selection || "None"}
  `.trim();

  switch (input.action) {
    case "titleIdeas":
      return `${sharedContext}

Return valid JSON matching this shape:
{
  "action": "titleIdeas",
  "suggestions": ["five SEO title ideas"]
}

Rules:
- Return exactly 5 title suggestions.
- Each suggestion must be concise, specific, and search-friendly.
- Weave in the focus keyword naturally when possible.
- Keep each title under 60 characters.`;
    case "metaDescription":
      return `${sharedContext}

Return valid JSON matching this shape:
{
  "action": "metaDescription",
  "text": "one meta description"
}

Rules:
- Write one compelling meta description.
- Keep it at or below 155 characters.
- Prefer active voice and include the focus keyword naturally.`;
    case "expandSection":
      return `${sharedContext}

Return valid JSON matching this shape:
{
  "action": "expandSection",
  "text": "expanded replacement paragraph"
}

Rules:
- Expand only the selected text.
- Keep the tone aligned with the draft.
- Add clarity, substance, and smooth flow without fluff.
- Return plain text only, no markdown bullets.`;
    case "improveReadability":
      return `${sharedContext}

Return valid JSON matching this shape:
{
  "action": "improveReadability",
  "text": "rewritten replacement paragraph"
}

Rules:
- Rewrite only the selected text.
- Improve clarity, flow, and readability.
- Keep the meaning intact.
- Return plain text only, no markdown bullets.`;
    case "suggestTags":
      return `${sharedContext}

Return valid JSON matching this shape:
{
  "action": "suggestTags",
  "tags": ["five tags"]
}

Rules:
- Return exactly 5 relevant tags.
- Keep tags short, descriptive, and unique.
- Do not include hash symbols.`;
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: "You must be signed in as an admin to use this tool." }, { status: 401 });
    }

    const askAiSettings = await getAskAiSettings();
    if (!askAiSettings.enabled) {
      return NextResponse.json({ error: "Ask AI is currently disabled." }, { status: 403 });
    }

    if (!env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured on the server." }, { status: 503 });
    }

    const body = (await request.json()) as {
      action: BlogAiAction;
      title?: string;
      excerpt?: string;
      content?: string;
      focusKeyword?: string;
      metaTitle?: string;
      metaDescription?: string;
      selection?: string;
    };

    if (!body?.action) {
      return NextResponse.json({ error: "Missing AI action." }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: env.OPENAI_ASK_AI_MODEL || env.OPENAI_COPILOT_MODEL || "gpt-4o",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are the AI Genius Lab blog CMS assistant.
Generate clean JSON only.
Help editors create SEO-conscious blog content following modern CMS best practices.
${askAiSettings.systemPrompt?.trim() ? `Additional instructions: ${askAiSettings.systemPrompt.trim()}` : ""}`,
        },
        {
          role: "user",
          content: buildUserPrompt(body),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      throw new Error("The AI assistant returned an empty response.");
    }

    const result = JSON.parse(raw);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("[admin.blog-ai] Unable to generate blog AI output.", error);
    return new Response("Internal server error", { status: 500 });
  }
}
