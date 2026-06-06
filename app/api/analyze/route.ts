import { NextRequest, NextResponse } from "next/server";
import { analyzeSchema } from "@/lib/schemas";
import { getProfile } from "@/lib/services/profiles";
import { archiveMessages } from "@/lib/services/archive";
import { runAnalysis, runStatelessAnalysis } from "@/lib/services/analysis";

export async function POST(req: NextRequest) {
  try {
    const body = analyzeSchema.parse(await req.json());

    if (body.profile_id) {
      const profile = await getProfile(body.profile_id);
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      if (body.archive) {
        await archiveMessages({ profileId: body.profile_id, messages: body.messages });
      }
      return NextResponse.json(
        await runAnalysis({ profile, messages: body.messages, userReaction: body.user_reaction })
      );
    }

    // Stateless mode — no Supabase required
    return NextResponse.json(
      await runStatelessAnalysis(body.messages, body.user_reaction)
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
