import { NextRequest, NextResponse } from "next/server";
import { deleteLibraryProfile } from "@/lib/services/library";
import { errorResponse, getUserId } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    return NextResponse.json({ ok: await deleteLibraryProfile(id, getUserId(req)) });
  } catch (e) {
    return errorResponse(e);
  }
}
