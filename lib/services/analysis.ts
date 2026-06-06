import { anthropic } from "../anthropic";
import { analysisOutputSchema } from "../schemas";
import { SYSTEM_PROMPT, buildAnalysisUserMessage } from "../prompts";
import { listArchive } from "./archive";
import { listPatterns, reinforcePatterns } from "./patterns";
import { db } from "../db";
import type { ProfileRow, AnalysisRow } from "../types";

const MAX_ARCHIVE = 60;
const MAX_PAST_ANALYSES = 5;

const ANALYSIS_TOOL = {
  name: "analysis_output",
  description: "Output the structured ScreenRead analysis",
  input_schema: {
    type: "object" as const,
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
        },
      },
      verdict: { type: "string" },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      referenced_history: { type: "array", items: { type: "string" } },
      detected_patterns: { type: "array", items: { type: "string" } },
      language: { type: "string", enum: ["en", "zh"] },
    },
    required: ["vibe_read", "reality_check", "response_options", "verdict", "confidence"],
  },
};

async function callClaude(userMessage: string) {
  const model = process.env.ANALYSIS_MODEL ?? "claude-sonnet-4-6";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model,
    max_tokens: 16000,
    thinking: { type: "enabled", budget_tokens: 8000 },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: "any" },
  };

  const response = await anthropic.messages.create(params);
  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("No structured output returned from analysis");
  }
  return analysisOutputSchema.parse(toolBlock.input);
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
    reinforcePatterns(params.profile.id, parsed.detected_patterns).catch(() => {});
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
