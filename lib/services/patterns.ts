import { db } from "../db";
import type { PatternRow } from "../types";

export async function listPatterns(profileId: string): Promise<PatternRow[]> {
  const { data, error } = await db
    .from("patterns")
    .select("*")
    .eq("profile_id", profileId)
    .order("last_observed", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface DetectedPattern {
  label: string;
  detail?: string;
  confidence?: string;
}

const RANK: Record<string, number> = { low: 1, medium: 2, high: 3 };
const BY_RANK = ["low", "low", "medium", "high"] as const;

export async function reinforcePatterns(
  profileId: string,
  detected: DetectedPattern[]
): Promise<void> {
  const existing = await listPatterns(profileId);

  for (const d of detected) {
    const match = existing.find((p) => similar(p.label, d.label));
    if (match) {
      const newCount = match.evidence_count + 1;
      // Confidence grows with corroboration: strongest of prior, the model's
      // fresh read, and what the evidence count implies (capped at "high").
      const rank = Math.min(
        3,
        Math.max(
          RANK[match.confidence] ?? 1,
          RANK[d.confidence ?? "low"] ?? 1,
          newCount
        )
      );
      await db
        .from("patterns")
        .update({
          evidence_count: newCount,
          confidence: BY_RANK[rank],
          detail: d.detail ?? match.detail,
          last_observed: new Date().toISOString(),
        })
        .eq("id", match.id);
    } else {
      await db.from("patterns").insert({
        profile_id: profileId,
        label: d.label,
        detail: d.detail ?? null,
        evidence_count: 1,
        confidence: d.confidence ?? "low",
      });
    }
  }
}

function similar(a: string, b: string): boolean {
  const wa = new Set(normalize(a).split(" ").filter((w) => w.length > 3));
  const wb = new Set(normalize(b).split(" ").filter((w) => w.length > 3));
  if (!wa.size || !wb.size) return false;
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  return overlap / Math.max(wa.size, wb.size) >= 0.6;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, "");
}
