import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateProfile, deleteProfile } from "@/lib/services/profiles";
import { updateProfileSchema } from "@/lib/schemas";
import { errorResponse, getUserId } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const profile = await getProfile(id, getUserId(req));
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(profile);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const input = updateProfileSchema.parse(await req.json());
    return NextResponse.json(await updateProfile(id, input, getUserId(req)));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    return NextResponse.json({ ok: await deleteProfile(id, getUserId(req)) });
  } catch (e) {
    return errorResponse(e);
  }
}
