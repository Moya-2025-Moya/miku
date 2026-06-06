import { NextRequest, NextResponse } from "next/server";
import { listProfiles, createProfile } from "@/lib/services/profiles";

function userId(req: NextRequest) {
  return req.headers.get("x-user-id") ?? "demo-user";
}

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(await listProfiles(userId(req)));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await createProfile(userId(req), await req.json());
    return NextResponse.json(profile, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
