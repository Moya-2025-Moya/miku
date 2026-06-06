import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAnthropic } from "@/lib/anthropic";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompts";
import { errorResponse } from "@/lib/http";

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .min(1),
  analysis_context: z
    .object({
      vibe_read: z.string().optional(),
      reality_check: z.string().optional(),
      verdict: z.string().optional(),
      confidence: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { messages, analysis_context } = chatSchema.parse(await req.json());

    const systemText = analysis_context
      ? `${CHAT_SYSTEM_PROMPT}\n\n---\nPrior analysis you gave (for context, don't repeat it back verbatim):\nVibe read: ${analysis_context.vibe_read ?? ""}\nReality check: ${analysis_context.reality_check ?? ""}\nVerdict: ${analysis_context.verdict ?? ""} (${analysis_context.confidence ?? ""})`
      : CHAT_SYSTEM_PROMPT;

    const model = process.env.ANALYSIS_MODEL ?? "claude-sonnet-4-6";

    const response = await getAnthropic().messages.create({
      model,
      max_tokens: 2048,
      system: systemText,
      messages,
    });

    const text = response.content.find((b) => b.type === "text");
    return NextResponse.json({ reply: text?.type === "text" ? text.text : "" });
  } catch (e) {
    return errorResponse(e);
  }
}
