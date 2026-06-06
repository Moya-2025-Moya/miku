import { NextResponse } from "next/server";
import { ZodError } from "zod";

// Centralized API error handling: client input problems are 400 (with field
// details), everything else (Anthropic, Supabase, network, missing config) is a
// 500 with a generic message — internal error strings are logged, never leaked.
export function errorResponse(e: unknown) {
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request", details: e.flatten() },
      { status: 400 }
    );
  }
  console.error(e);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
