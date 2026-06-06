import { getAnthropic } from "../anthropic";
import { analysisOutputSchema } from "../schemas";
import { SYSTEM_PROMPT, buildAnalysisUserMessage } from "../prompts";
import { listArchive } from "./archive";
import { listPatterns, reinforcePatterns } from "./patterns";
import { getDb } from "../db";
import type { ProfileRow, AnalysisRow } from "../types";

const MAX_ARCHIVE = 60;
const MAX_PAST_ANALYSES = 5;

// JSON Schema for server-side structured outputs. Unlike forced tool_choice,
// `output_config.format` enforces the shape at the sampler (no string-instead-
// of-array drift that was 400-ing Chinese inputs) AND is compatible with
// extended thinking. Strict mode requires every object property in `required`
// and additionalProperties:false everywhere. Arrays may be empty.
const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    vibe_read: { type: "string" },
    reality_check: { type: "string" },
    response_options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tone: { type: "string" },
          draft: { type: "string" },
        },
        required: ["tone", "draft"],
        additionalProperties: false,
      },
    },
    verdict: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    referenced_history: { type: "array", items: { type: "string" } },
    detected_patterns: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          detail: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["label", "detail", "confidence"],
        additionalProperties: false,
      },
    },
    language: { type: "string", enum: ["en", "zh"] },
  },
  required: [
    "vibe_read",
    "reality_check",
    "response_options",
    "verdict",
    "confidence",
    "referenced_history",
    "detected_patterns",
    "language",
  ],
  additionalProperties: false,
};

// Shared request params. Structured outputs (output_config.format) guarantee a
// schema-valid JSON response and, unlike forced tool_choice, allow adaptive
// thinking — so we get both reliable structure and reasoning quality. Works on
// Sonnet 4.6 and Opus. (effort is ignored by models that don't support it.)
function buildParams(userMessage: string) {
  const model = process.env.ANALYSIS_MODEL ?? "claude-sonnet-4-6";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      // "medium" is the demo sweet spot: ~12s EN / ~16s ZH with quality on par
      // with "high" (which ran ~18s/~42s). Override via ANALYSIS_EFFORT.
      effort: process.env.ANALYSIS_EFFORT ?? "medium",
      format: { type: "json_schema", schema: ANALYSIS_JSON_SCHEMA },
    },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  };
  return params;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAnalysisText(content: any[]) {
  const textBlock = content.find((b: { type: string }) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No structured output returned from analysis");
  }
  return analysisOutputSchema.parse(JSON.parse(textBlock.text));
}

async function callClaude(userMessage: string) {
  const response = await getAnthropic().messages.create(buildParams(userMessage));
  return parseAnalysisText(response.content);
}

// Streaming variant: forwards the JSON text deltas to `onText` as they arrive,
// then parses the completed message. Used by the SSE analyze path.
async function streamClaude(userMessage: string, onText: (t: string) => void) {
  const stream = getAnthropic().messages.stream(buildParams(userMessage));
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      onText(event.delta.text);
    }
  }
  const final = await stream.finalMessage();
  return parseAnalysisText(final.content);
}

async function assembleUserMessage(params: {
  profile: ProfileRow;
  messages: { sender: string; body: string }[];
  userReaction?: string;
}): Promise<string> {
  const [archive, patterns, pastAnalyses] = await Promise.all([
    listArchive(params.profile.id, MAX_ARCHIVE),
    listPatterns(params.profile.id),
    listAnalyses(params.profile.id),
  ]);
  return buildAnalysisUserMessage({
    profile: params.profile,
    patterns,
    archive,
    pastAnalyses: pastAnalyses.slice(0, MAX_PAST_ANALYSES),
    messages: params.messages,
    userReaction: params.userReaction,
  });
}

function statelessUserMessage(
  messages: { sender: string; body: string }[],
  userReaction?: string
): string {
  return (
    "Current exchange:\n" +
    messages.map((m) => `[${m.sender}] ${m.body}`).join("\n") +
    (userReaction ? `\n\nYour reaction: ${userReaction}` : "")
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reinforceFrom(profileId: string, parsed: any) {
  if (parsed.detected_patterns?.length) {
    // detected_patterns may arrive as bare strings or rich objects — normalize.
    const normalized = parsed.detected_patterns.map((p: unknown) =>
      typeof p === "string" ? { label: p } : p
    );
    reinforcePatterns(profileId, normalized).catch(() => {});
  }
}

type StatelessAnalysis = Omit<
  AnalysisRow,
  "id" | "profile_id" | "input_messages" | "created_at"
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStateless(userReaction: string | undefined, parsed: any): StatelessAnalysis {
  return {
    user_reaction: userReaction ?? null,
    vibe_read: parsed.vibe_read,
    reality_check: parsed.reality_check,
    response_options: parsed.response_options,
    verdict: parsed.verdict,
    confidence: parsed.confidence,
    referenced_history: parsed.referenced_history ?? null,
    language: parsed.language,
  };
}

export async function runAnalysis(params: {
  profile: ProfileRow;
  messages: { sender: string; body: string }[];
  userReaction?: string;
}): Promise<AnalysisRow> {
  const userMessage = await assembleUserMessage(params);
  const parsed = await callClaude(userMessage);
  const saved = await saveAnalysis(params.profile.id, params.messages, params.userReaction, parsed);
  reinforceFrom(params.profile.id, parsed);
  return saved;
}

export async function runStatelessAnalysis(
  messages: { sender: string; body: string }[],
  userReaction?: string
): Promise<StatelessAnalysis> {
  const parsed = await callClaude(statelessUserMessage(messages, userReaction));
  return toStateless(userReaction, parsed);
}

// ── Streaming variants (SSE): forward JSON deltas, then persist/return ────────
export async function runAnalysisStream(
  params: {
    profile: ProfileRow;
    messages: { sender: string; body: string }[];
    userReaction?: string;
  },
  onText: (t: string) => void
): Promise<AnalysisRow> {
  const userMessage = await assembleUserMessage(params);
  const parsed = await streamClaude(userMessage, onText);
  const saved = await saveAnalysis(params.profile.id, params.messages, params.userReaction, parsed);
  reinforceFrom(params.profile.id, parsed);
  return saved;
}

export async function runStatelessAnalysisStream(
  messages: { sender: string; body: string }[],
  userReaction: string | undefined,
  onText: (t: string) => void
): Promise<StatelessAnalysis> {
  const parsed = await streamClaude(statelessUserMessage(messages, userReaction), onText);
  return toStateless(userReaction, parsed);
}

async function saveAnalysis(
  profileId: string,
  inputMessages: unknown,
  userReaction: string | undefined,
  output: ReturnType<typeof analysisOutputSchema.parse>
): Promise<AnalysisRow> {
  const { data, error } = await getDb()
    .from("analyses")
    .insert({
      profile_id: profileId,
      input_messages: inputMessages,
      user_reaction: userReaction ?? null,
      vibe_read: output.vibe_read,
      reality_check: output.reality_check,
      response_options: output.response_options,
      verdict: output.verdict,
      confidence: output.confidence,
      referenced_history: output.referenced_history ?? null,
      language: output.language,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listAnalyses(profileId: string): Promise<AnalysisRow[]> {
  const { data, error } = await getDb()
    .from("analyses")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}
