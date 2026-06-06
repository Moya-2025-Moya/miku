import { NextRequest, NextResponse } from "next/server";
import { analyzeSchema } from "@/lib/schemas";
import { getProfile } from "@/lib/services/profiles";
import { archiveMessages } from "@/lib/services/archive";
import {
  runAnalysis,
  runStatelessAnalysis,
  runAnalysisStream,
  runStatelessAnalysisStream,
} from "@/lib/services/analysis";
import { errorResponse, getUserId } from "@/lib/http";
import type { ProfileRow } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = analyzeSchema.parse(await req.json());

    // Resolve profile (stateful) up front so a 404 / archive happens before we
    // commit to an SSE response.
    let profile: ProfileRow | null = null;
    if (body.profile_id) {
      profile = await getProfile(body.profile_id, getUserId(req));
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      if (body.archive) {
        await archiveMessages({ profileId: body.profile_id, messages: body.messages });
      }
    }

    // ── Streaming (SSE) ──────────────────────────────────────────────────────
    if (body.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (obj: unknown) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
          const onText = (t: string) => send({ text: t });
          try {
            const result = profile
              ? await runAnalysisStream(
                  { profile, messages: body.messages, userReaction: body.user_reaction },
                  onText
                )
              : await runStatelessAnalysisStream(body.messages, body.user_reaction, onText);
            send({ done: true, analysis: result });
          } catch (err) {
            console.error(err);
            send({ error: "Analysis failed. Please try again." });
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // ── Plain JSON (default) ─────────────────────────────────────────────────
    if (profile) {
      return NextResponse.json(
        await runAnalysis({ profile, messages: body.messages, userReaction: body.user_reaction })
      );
    }
    return NextResponse.json(
      await runStatelessAnalysis(body.messages, body.user_reaction)
    );
  } catch (e) {
    return errorResponse(e);
  }
}
