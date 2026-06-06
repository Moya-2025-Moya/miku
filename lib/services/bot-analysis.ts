import { getAnthropic } from "../anthropic";
import { SYSTEM_PROMPT } from "../prompts";

// Telegram-facing analysis. Same brain as the web (/api/analyze reuses
// SYSTEM_PROMPT verbatim) but with one addition: a *clarify gate*. When the
// input doesn't carry enough context to give an honest read, the model asks one
// warm, specific question instead of forcing a confident-but-wrong analysis.

const BOT_ADDENDUM = `
You are texting the user inside Telegram, like a friend in their DMs.

Before anything, judge whether you actually have enough to give an honest read. Set needs_context = true and ask ONE short, specific question when:
- it's unclear who the other person is or what they mean to the user,
- you can't tell which messages are "them" vs "the user",
- the content isn't really a conversation (e.g. a link, a screenshot of an app, a single ambiguous word),
- or you don't know what the user is actually worried about.
Your question should be warm and concrete ("who's this from, and what's the part that's bugging you?"), never a generic "tell me more". When you ask, leave the analysis fields empty.

Only when you have enough, set needs_context = false and produce the full four-part read. Keep every field tight and texty — this is a chat, not an essay.`;

const BOT_JSON_SCHEMA = {
  type: "object",
  properties: {
    needs_context: { type: "boolean" },
    clarifying_question: { type: "string" },
    vibe_read: { type: "string" },
    reality_check: { type: "string" },
    response_options: {
      type: "array",
      items: {
        type: "object",
        properties: { tone: { type: "string" }, draft: { type: "string" } },
        required: ["tone", "draft"],
        additionalProperties: false,
      },
    },
    verdict: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    language: { type: "string", enum: ["en", "zh"] },
  },
  required: [
    "needs_context",
    "clarifying_question",
    "vibe_read",
    "reality_check",
    "response_options",
    "verdict",
    "confidence",
    "language",
  ],
  additionalProperties: false,
};

export interface BotAnalysis {
  needs_context: boolean;
  clarifying_question: string;
  vibe_read: string;
  reality_check: string;
  response_options: { tone: string; draft: string }[];
  verdict: string;
  confidence: "low" | "medium" | "high";
  language: "en" | "zh";
}

export async function runBotAnalysis(
  messages: { sender: string; body: string }[],
  extraContext?: string
): Promise<BotAnalysis> {
  const userMessage =
    "Current exchange:\n" +
    messages.map((m) => `[${m.sender}] ${m.body}`).join("\n") +
    (extraContext ? `\n\nContext the user added when asked:\n${extraContext}` : "");

  const model = process.env.ANALYSIS_MODEL ?? "claude-sonnet-4-6";
  // Built as `any` to match analysis.ts — output_config isn't in the SDK types yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: process.env.ANALYSIS_EFFORT ?? "medium",
      format: { type: "json_schema", schema: BOT_JSON_SCHEMA },
    },
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: BOT_ADDENDUM },
    ],
    messages: [{ role: "user", content: userMessage }],
  };
  const response = await getAnthropic().messages.create(params);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textBlock = (response.content as any[]).find((b) => b.type === "text");
  if (!textBlock) throw new Error("No structured output from bot analysis");
  return JSON.parse(textBlock.text) as BotAnalysis;
}
