// src/app/api/copilot/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, courseTitle } = await req.json();

    const systemPrompt = `You are an expert AI learning copilot for the course: "${courseTitle}".
Your role is to:
- Answer questions about course concepts clearly and thoroughly
- Generate practice exercises and coding challenges
- Explain complex topics in simple terms with analogies
- Create quizzes to test understanding
- Suggest related resources and next steps
- Motivate and guide the student's learning journey

Be concise but thorough. Use markdown for code blocks and structure. Keep responses focused and actionable.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.slice(-10), // Keep last 10 messages
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "I couldn't generate a response. Please try again.";

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Copilot API error:", error);
    return NextResponse.json(
      { content: "⚠️ AI copilot is temporarily unavailable. Please ensure your ANTHROPIC_API_KEY is configured." },
      { status: 200 } // Return 200 so client shows the error message gracefully
    );
  }
}
