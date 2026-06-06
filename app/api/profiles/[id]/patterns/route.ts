import { NextRequest, NextResponse } from "next/server";
import { listPatterns } from "@/lib/services/patterns";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    return NextResponse.json(await listPatterns(id));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
