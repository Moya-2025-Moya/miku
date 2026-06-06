import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callSingleTool } from "@/lib/anthropic-tool";
import { errorResponse } from "@/lib/http";

// Profile context is passed through verbatim from the page (it already holds the
// full working copy). We keep validation loose — the model only reads it.
const schema = z.object({
  message: z.string().min(1),
  profile: z.record(z.string(), z.unknown()),
});

const MIKU_TOOL = {
  name: "miku_action",
  description: "Respond to the user and optionally modify the relationship profile.",
  input_schema: {
    type: "object" as const,
    required: ["reply", "action"],
    properties: {
      reply: { type: "string", description: "Natural language response shown to the user." },
      action: {
        type: "string",
        enum: [
          "none",
          "deleteEvent",
          "addEvent",
          "addNote",
          "addPattern",
          "changeType",
          "renameEvent",
          "updateAnalysis",
          "batch",
        ],
      },
      params: {
        type: "object",
        description:
          "Action parameters. Varies by action:\n" +
          "deleteEvent: {eventId}\n" +
          "addEvent: {title, date, tags[]}\n" +
          "addNote: {text}\n" +
          "addPattern: {text}\n" +
          "changeType: {type}\n" +
          "renameEvent: {eventId, newTitle}\n" +
          "updateAnalysis: {eventId, field ('happened'|'trigger'|'forward'), newText}\n" +
          "batch: {actions: [{type, ...params}]} — for multi-field edits like pronoun changes",
      },
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const { message, profile } = schema.parse(await req.json());
    const system =
      "You are Miku — a personal relationship memory library.\n" +
      "You help users understand and manage their relationship dynamics using psychological insight.\n\n" +
      "Current profile (full content including all analysis text):\n" +
      JSON.stringify(profile, null, 2) +
      "\n\n" +
      "You MUST call the miku_action tool for every response — no exceptions.\n\n" +
      "Key capabilities:\n" +
      "- For 'change pronouns', 'rewrite X', 'update all mentions of Y': use 'batch' with multiple updateAnalysis actions covering every affected field.\n" +
      "- For 'updateAnalysis': field names are 'happened', 'trigger', 'forward'.\n" +
      "- For batch pronoun/rewrite tasks: include ALL fields of ALL affected events. Rewrite the complete text for each field — not just the changed words.\n" +
      "- For analysis/summary questions: use action 'none' and answer in reply.\n" +
      "- Be warm, psychologically insightful, and concise.";

    const result = await callSingleTool({ system, userContent: message, tool: MIKU_TOOL });
    return NextResponse.json(result ?? { reply: "Something went wrong.", action: "none" });
  } catch (e) {
    return errorResponse(e);
  }
}
