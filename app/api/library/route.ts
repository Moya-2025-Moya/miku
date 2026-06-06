import { NextRequest, NextResponse } from "next/server";
import { getLibrary } from "@/lib/services/library";
import { errorResponse, getUserId } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(await getLibrary(getUserId(req)));
  } catch (e) {
    return errorResponse(e);
  }
}
