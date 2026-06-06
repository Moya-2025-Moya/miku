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
  // Opt-in SSE streaming. Backward compatible: omit for the plain JSON response.
  stream: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { messages, analysis_context, stream } = chatSchema.parse(await req.json());

    const systemText = analysis_context
      ? `${CHAT_SYSTEM_PROMPT}\n\n---\nPrior analysis you gave (for context, don't repeat it back verbatim):\nVibe read: ${analysis_context.vibe_read ?? ""}\nReality check: ${analysis_context.reality_check ?? ""}\nVerdict: ${analysis_context.verdict ?? ""} (${analysis_context.confidence ?? ""})`
      : CHAT_SYSTEM_PROMPT;

    const model = process.env.ANALYSIS_MODEL ?? "claude-sonnet-4-6";
    const client = getAnthropic();

    // ── Streaming (SSE) ──────────────────────────────────────────────────────
    if (stream) {
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (obj: unknown) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
          try {
            const ms = client.messages.stream({
              model,
              max_tokens: 2048,
              system: systemText,
              messages,
            });
            for await (const event of ms) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                send({ text: event.delta.text });
              }
            }
            send({ done: true });
          } catch (err) {
            console.error(err);
            send({ error: "stream_error" });
          } finally {
            controller.close();
          }
        },
      });
      return new Response(body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // ── Plain JSON (default) ─────────────────────────────────────────────────
    const response = await client.messages.create({
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
