import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callSingleTool } from "@/lib/anthropic-tool";
import { errorResponse } from "@/lib/http";

const schema = z.object({
  profile: z.string().default(""),
  growth: z.string().default(""),
  archive: z.array(z.unknown()).default([]),
});

const ARCHETYPE_TOOL = {
  name: "archetype_reveal",
  description: "Assign the user to one of 7 animal archetypes based on their relationship patterns.",
  input_schema: {
    type: "object" as const,
    required: ["archetype_key", "personalized_reason"],
    properties: {
      archetype_key: {
        type: "string",
        enum: ["wolf", "crane", "bear", "fox", "deer", "crow", "otter"],
        description:
          "The archetype that best fits this person authentically — not the most flattering, the most accurate.",
      },
      personalized_reason: {
        type: "string",
        description:
          "1–2 sentences explaining why this person is this archetype. Reference something specific from their patterns or events.",
      },
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const { profile, growth, archive } = schema.parse(await req.json());
    const system =
      "You are Miku. Based on this person's psychological profile and relationship archive, assign them one of 7 animal archetypes:\n\n" +
      "• wolf — fiercely loyal inner circle, emotionally guarded until trust is earned\n" +
      "• crane — high emotional intelligence, socially graceful, tends to self-erase for others\n" +
      "• bear — steady anchor, absorbs others' chaos, deeply wounded when trust breaks\n" +
      "• fox — sharp pattern reader, processes alone, sees dynamics others miss\n" +
      "• deer — deeply empathetic, conflict-avoidant, absorbs others' emotions\n" +
      "• crow — analytical, highly sensitive to inconsistency, processes pain through understanding\n" +
      "• otter — warmth-giver, connection-seeker, can over-invest emotionally\n\n" +
      "Choose the one that fits most authentically. Write a 1–2 sentence personalised reason referencing something specific from their patterns.";

    const result = await callSingleTool({
      system,
      userContent:
        "Profile:\n" +
        profile +
        "\n\nGrowth edges:\n" +
        growth +
        "\n\nRelationship archive summary:\n" +
        JSON.stringify(archive, null, 2),
      tool: ARCHETYPE_TOOL,
      maxTokens: 300,
    });
    return NextResponse.json(result ?? {});
  } catch (e) {
    return errorResponse(e);
  }
}
