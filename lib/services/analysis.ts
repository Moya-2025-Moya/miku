import { getAnthropic } from "../anthropic";
import { analysisOutputSchema } from "../schemas";
import { SYSTEM_PROMPT, buildAnalysisUserMessage } from "../prompts";
import { listArchive } from "./archive";
import { listPatterns, reinforcePatterns } from "./patterns";
import { db } from "../db";
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

async function callClaude(userMessage: string) {
  const model = process.env.ANALYSIS_MODEL ?? "claude-sonnet-4-6";
  // Structured outputs (output_config.format) guarantee a schema-valid JSON
  // response and, unlike forced tool_choice, allow adaptive thinking — so we
  // get both reliable structure and reasoning quality. Works on Sonnet 4.6 and
  // Opus. (effort is ignored by models that don't support it.)
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

  const response = await getAnthropic().messages.create(params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textBlock = response.content.find((b: any) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No structured output returned from analysis");
  }
  return analysisOutputSchema.parse(JSON.parse(textBlock.text));
}

export async function runAnalysis(params: {
  profile: ProfileRow;
  messages: { sender: string; body: string }[];
  userReaction?: string;
}): Promise<AnalysisRow> {
  const [archive, patterns, pastAnalyses] = await Promise.all([
    listArchive(params.profile.id, MAX_ARCHIVE),
    listPatterns(params.profile.id),
    listAnalyses(params.profile.id),
  ]);

  const userMessage = buildAnalysisUserMessage({
    profile: params.profile,
    patterns,
    archive,
    pastAnalyses: pastAnalyses.slice(0, MAX_PAST_ANALYSES),
    messages: params.messages,
    userReaction: params.userReaction,
  });

  const parsed = await callClaude(userMessage);
  const saved = await saveAnalysis(params.profile.id, params.messages, params.userReaction, parsed);

  if (parsed.detected_patterns?.length) {
    // detected_patterns may arrive as bare strings or rich objects — normalize.
    const normalized = parsed.detected_patterns.map((p) =>
      typeof p === "string" ? { label: p } : p
    );
    reinforcePatterns(params.profile.id, normalized).catch(() => {});
  }

  return saved;
}

export async function runStatelessAnalysis(
  messages: { sender: string; body: string }[],
  userReaction?: string
): Promise<Omit<AnalysisRow, "id" | "profile_id" | "input_messages" | "created_at">> {
  const userMessage =
    "Current exchange:\n" +
    messages.map((m) => `[${m.sender}] ${m.body}`).join("\n") +
    (userReaction ? `\n\nYour reaction: ${userReaction}` : "");

  const parsed = await callClaude(userMessage);

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

async function saveAnalysis(
  profileId: string,
  inputMessages: unknown,
  userReaction: string | undefined,
  output: ReturnType<typeof analysisOutputSchema.parse>
): Promise<AnalysisRow> {
  const { data, error } = await db
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
  const { data, error } = await db
    .from("analyses")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}
