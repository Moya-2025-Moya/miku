import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "../anthropic";
import { IMPORT_SYSTEM_PROMPT } from "../prompts";

const extractionSchema = z.object({
  suggested_name: z.string().nullable(),
  messages: z.array(z.object({ sender: z.string(), body: z.string() })),
  summary: z.string(),
});

export interface ImportArgs {
  text?: string;
  image?: {
    data: string;
    media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  };
}

export async function extractImport(
  args: ImportArgs
): Promise<z.infer<typeof extractionSchema>> {
  const model = process.env.IMPORT_MODEL ?? "claude-haiku-4-5-20251001";

  const content: Anthropic.ContentBlockParam[] = [];

  if (args.image) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: args.image.media_type,
        data: args.image.data,
      },
    });
  }

  if (args.text) {
    content.push({ type: "text", text: args.text });
  }

  const tools: Anthropic.Tool[] = [
    {
      name: "extract_messages",
      description: "Extract messages from the provided content",
      input_schema: {
        type: "object",
        properties: {
          suggested_name: { type: ["string", "null"] },
          messages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sender: { type: "string" },
                body: { type: "string" },
              },
              required: ["sender", "body"],
            },
          },
          summary: { type: "string" },
        },
        required: ["suggested_name", "messages", "summary"],
      },
    },
  ];

  const response = await getAnthropic().messages.create({
    model,
    max_tokens: 4096,
    system: IMPORT_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    tools,
    tool_choice: { type: "any" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("No extraction output from import");
  }

  return extractionSchema.parse(toolBlock.input);
}
