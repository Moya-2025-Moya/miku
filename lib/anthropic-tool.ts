import { getAnthropic } from "./anthropic";
import type Anthropic from "@anthropic-ai/sdk";

// Forces a single-tool response and returns its validated input object. Used by
// the relationship-library AI endpoints, which all expect structured output.
export async function callSingleTool<T = Record<string, unknown>>(opts: {
  system: string;
  userContent: string;
  tool: Anthropic.Tool;
  maxTokens?: number;
}): Promise<T | null> {
  const client = getAnthropic();
  const model = process.env.ANALYSIS_MODEL ?? "claude-sonnet-4-6";
  const res = await client.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 2048,
    system: opts.system,
    tools: [opts.tool],
    tool_choice: { type: "any" },
    messages: [{ role: "user", content: opts.userContent }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  return block && block.type === "tool_use" ? (block.input as T) : null;
}
