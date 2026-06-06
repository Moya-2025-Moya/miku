import { NextRequest, NextResponse } from "next/server";
import { listAnalyses } from "@/lib/services/analysis";
import { profileBelongsTo } from "@/lib/services/profiles";
import { errorResponse, getUserId } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    if (!(await profileBelongsTo(id, getUserId(req)))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(await listAnalyses(id));
  } catch (e) {
    return errorResponse(e);
  }
}
