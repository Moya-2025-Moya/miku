import { NextRequest, NextResponse } from "next/server";
import { listArchive, archiveMessages } from "@/lib/services/archive";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    return NextResponse.json(await listArchive(id));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const body = await req.json();
    return NextResponse.json(
      await archiveMessages({ profileId: id, ...body }),
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
