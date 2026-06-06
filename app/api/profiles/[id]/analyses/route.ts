import { NextRequest, NextResponse } from "next/server";
import { listAnalyses } from "@/lib/services/analysis";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    return NextResponse.json(await listAnalyses(id));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
