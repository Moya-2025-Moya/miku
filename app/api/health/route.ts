import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    analysisModel: process.env.ANALYSIS_MODEL ?? "claude-sonnet-4-6",
    importModel: process.env.IMPORT_MODEL ?? "claude-haiku-4-5-20251001",
    supabase: isSupabaseConfigured(),
  });
}
