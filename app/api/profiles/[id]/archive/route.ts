import { NextRequest, NextResponse } from "next/server";
import { listArchive, archiveMessages } from "@/lib/services/archive";
import { profileBelongsTo } from "@/lib/services/profiles";
import { archiveMessagesSchema } from "@/lib/schemas";
import { errorResponse, getUserId } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    if (!(await profileBelongsTo(id, getUserId(req)))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(await listArchive(id));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    if (!(await profileBelongsTo(id, getUserId(req)))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = archiveMessagesSchema.parse(await req.json());
    return NextResponse.json(
      await archiveMessages({ profileId: id, ...body }),
      { status: 201 }
    );
  } catch (e) {
    return errorResponse(e);
  }
}
