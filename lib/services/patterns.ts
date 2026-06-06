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

export async function reinforcePatterns(
  profileId: string,
  detected: string[]
): Promise<void> {
  const existing = await listPatterns(profileId);

  for (const label of detected) {
    const match = existing.find((p) => similar(p.label, label));
    if (match) {
      const newCount = match.evidence_count + 1;
      const newConfidence =
        newCount >= 5 ? "high" : newCount >= 3 ? "medium" : "low";
      await db
        .from("patterns")
        .update({
          evidence_count: newCount,
          confidence: newConfidence,
          last_observed: new Date().toISOString(),
        })
        .eq("id", match.id);
    } else {
      await db.from("patterns").insert({
        profile_id: profileId,
        label,
        evidence_count: 1,
        confidence: "low",
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
