import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callSingleTool } from "@/lib/anthropic-tool";
import { errorResponse } from "@/lib/http";

const schema = z.object({
  archive: z.array(z.unknown()),
});

const SELF_TOOL = {
  name: "self_profile",
  description: "Return the user's psychological self-portrait and growth edges.",
  input_schema: {
    type: "object" as const,
    required: ["profile", "growth"],
    properties: {
      profile: {
        type: "string",
        description:
          "2–3 short paragraphs. Write in second person. Bold key observed patterns with **double asterisks**. Be specific and warm — reference actual events. No headers, no bullet points, just flowing prose with bolded insights.",
      },
      growth: {
        type: "string",
        description:
          "3 actionable growth edges, each as a short paragraph. Bold the core tension or pattern with **double asterisks**. Keep each edge grounded in something you actually observed.",
      },
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const { archive } = schema.parse(await req.json());
    const system =
      "You are Miku, a perceptive relationship psychologist. Read across this person's full relationship archive and write a psychological portrait of WHO THEY ARE — not who the other people are.\n\n" +
      "Focus on: recurring emotional patterns, how they handle conflict and disappointment, where they give too much or too little, what they need but rarely ask for, and where their genuine strength shows up.\n\n" +
      "Write in second person ('you tend to…', 'what you're really doing is…'). Be honest and warm — not a pep talk, not a diagnosis. Use **double asterisks** around key observed patterns so they render as bold. Keep it concise — 2–3 short paragraphs for the portrait, 3 focused growth edges. No JSON syntax, no code blocks — plain flowing prose only.";

    const result = await callSingleTool({
      system,
      userContent: "Here is my full relationship archive:\n" + JSON.stringify(archive, null, 2),
      tool: SELF_TOOL,
      maxTokens: 1400,
    });
    return NextResponse.json(result ?? { profile: "", growth: "" });
  } catch (e) {
    return errorResponse(e);
  }
}
