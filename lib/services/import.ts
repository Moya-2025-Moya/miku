import { z } from "zod";
import { anthropic } from "../anthropic";
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

  type ContentBlock =
    | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
    | { type: "text"; text: string };

  const content: ContentBlock[] = [];

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (anthropic.messages.create as any)({
    model,
    max_tokens: 4096,
    system: IMPORT_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    tools: [
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
    ],
    tool_choice: { type: "any" },
  });

  const toolBlock = response.content.find(
    (b: { type: string }) => b.type === "tool_use"
  );
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("No extraction output from import");
  }

  return extractionSchema.parse((toolBlock as { type: "tool_use"; input: unknown }).input);
}
