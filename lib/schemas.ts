import { z } from "zod";

export const analysisOutputSchema = z.object({
  vibe_read: z.string(),
  reality_check: z.string(),
  response_options: z.array(
    z.object({
      tone: z.string(),
      draft: z.string(),
    })
  ),
  verdict: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  // These two are non-essential metadata. The model occasionally returns them
  // in a slightly off shape (e.g. a string instead of an array); .catch keeps a
  // drift here from 400-ing the entire analysis. detected_patterns accepts both
  // bare strings and rich objects — normalized downstream before reinforcement.
  referenced_history: z.array(z.string()).optional().catch(undefined),
  detected_patterns: z
    .array(
      z.union([
        z.string(),
        z.object({
          label: z.string(),
          detail: z.string().optional(),
          confidence: z.enum(["low", "medium", "high"]).optional(),
        }),
      ])
    )
    .optional()
    .catch(undefined),
  language: z.enum(["en", "zh"]).default("en"),
});

export const createProfileSchema = z.object({
  name: z.string().min(1),
  relationship_type: z.string().optional(),
  context_notes: z.string().optional(),
  feelings: z.string().optional(),
  avatar_emoji: z.string().optional(),
});

export const updateProfileSchema = createProfileSchema.partial();

export const archiveMessagesSchema = z.object({
  messages: z
    .array(
      z.object({
        sender: z.string(),
        body: z.string(),
        sent_at: z.string().optional(),
      })
    )
    .min(1),
  annotation: z.string().optional(),
  source: z.string().default("native"),
});

export const analyzeSchema = z.object({
  profile_id: z.string().uuid().optional(),
  messages: z
    .array(z.object({ sender: z.string(), body: z.string() }))
    .min(1),
  user_reaction: z.string().optional(),
  archive: z.boolean().default(false),
  // Opt-in SSE streaming. Backward compatible: omit for the plain JSON response.
  stream: z.boolean().optional(),
});

export const importSchema = z
  .object({
    text: z.string().optional(),
    image: z
      .object({
        data: z.string(),
        media_type: z.enum(["image/png", "image/jpeg", "image/gif", "image/webp"]),
      })
      .optional(),
    profile_id: z.string().uuid().optional(),
  })
  .refine((d) => d.text || d.image, { message: "Either text or image required" });
