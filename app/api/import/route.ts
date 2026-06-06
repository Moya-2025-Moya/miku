import { NextRequest, NextResponse } from "next/server";
import { importSchema } from "@/lib/schemas";
import { extractImport } from "@/lib/services/import";
import { findProfileByName, createProfile } from "@/lib/services/profiles";
import { archiveMessages } from "@/lib/services/archive";
import { isSupabaseConfigured } from "@/lib/db";
import { errorResponse } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") ?? "demo-user";
    const body = importSchema.parse(await req.json());
    const extracted = await extractImport(body);

    let profileId = body.profile_id;

    if (isSupabaseConfigured() && !profileId && extracted.suggested_name) {
      const found = await findProfileByName(userId, extracted.suggested_name);
      if (found) {
        profileId = found.id;
      } else {
        const created = await createProfile(userId, { name: extracted.suggested_name });
        profileId = created.id;
      }
    }

    if (isSupabaseConfigured() && profileId && extracted.messages.length) {
      await archiveMessages({ profileId, messages: extracted.messages, source: "import" });
    }

    return NextResponse.json({ ...extracted, profile_id: profileId ?? null });
  } catch (e) {
    return errorResponse(e);
  }
}
