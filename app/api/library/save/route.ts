import { NextRequest, NextResponse } from "next/server";
import { saveProfileState } from "@/lib/services/library";
import { libraryProfileSchema } from "@/lib/schemas";
import { errorResponse, getUserId } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    const profile = libraryProfileSchema.parse(await req.json());
    await saveProfileState(getUserId(req), profile);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
