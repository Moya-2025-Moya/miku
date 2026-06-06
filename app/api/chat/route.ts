import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompts";

interface AnalysisContext {
  vibe_read?: string;
  reality_check?: string;
  verdict?: string;
  confidence?: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      analysis_context,
    }: {
      messages: { role: string; content: string }[];
      analysis_context?: AnalysisContext;
    } = await req.json();

    const systemText = analysis_context
      ? `${CHAT_SYSTEM_PROMPT}\n\n---\nPrior analysis you gave (for context, don't repeat it back verbatim):\nVibe read: ${analysis_context.vibe_read ?? ""}\nReality check: ${analysis_context.reality_check ?? ""}\nVerdict: ${analysis_context.verdict ?? ""} (${analysis_context.confidence ?? ""})`
      : CHAT_SYSTEM_PROMPT;

    const model = process.env.ANALYSIS_MODEL ?? "claude-sonnet-4-6";

    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: systemText,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const text = response.content.find((b) => b.type === "text");
    return NextResponse.json({ reply: text?.type === "text" ? text.text : "" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
