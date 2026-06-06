import { NextRequest, NextResponse } from "next/server";
import { listProfiles, createProfile } from "@/lib/services/profiles";
import { createProfileSchema } from "@/lib/schemas";
import { errorResponse, getUserId } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(await listProfiles(getUserId(req)));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = createProfileSchema.parse(await req.json());
    const profile = await createProfile(getUserId(req), input);
    return NextResponse.json(profile, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
