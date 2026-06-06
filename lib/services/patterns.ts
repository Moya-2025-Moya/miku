import { getDb } from "../db";
import type { PatternRow } from "../types";

export async function listPatterns(profileId: string): Promise<PatternRow[]> {
  const { data, error } = await getDb()
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
  const now = new Date().toISOString();

  await Promise.all(
    detected.map((d) => {
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
        return getDb()
          .from("patterns")
          .update({
            evidence_count: newCount,
            confidence: BY_RANK[rank],
            detail: d.detail ?? match.detail,
            last_observed: now,
          })
          .eq("id", match.id);
      }
      return getDb().from("patterns").insert({
        profile_id: profileId,
        label: d.label,
        detail: d.detail ?? null,
        evidence_count: 1,
        confidence: d.confidence ?? "low",
      });
    })
  );
}

// Language-agnostic fuzzy match. Latin labels compare on shared words; CJK and
// other space-less scripts (which earlier collapsed to a single token) compare
// on character bigrams, so e.g. "回避型依恋" reinforces an existing record
// instead of inserting a duplicate every analysis.
function similar(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Phrasing drift in any language (one label a superset of the other).
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = tokenize(na);
  const wb = tokenize(nb);
  if (!wa.size || !wb.size) return false;
  let overlap = 0;
  for (const t of wa) if (wb.has(t)) overlap++;
  return overlap / Math.max(wa.size, wb.size) >= 0.6;
}

function tokenize(s: string): Set<string> {
  const words = s.split(/\s+/).filter((w) => w.length > 3);
  if (words.length) return new Set(words);
  // No usable whitespace-delimited words (e.g. Chinese): use character bigrams.
  const chars = [...s.replace(/\s+/g, "")];
  if (chars.length < 2) return new Set(chars);
  const bigrams = new Set<string>();
  for (let i = 0; i < chars.length - 1; i++) bigrams.add(chars[i] + chars[i + 1]);
  return bigrams;
}

// Keep letters/digits from ALL scripts (\p{L}\p{N} with the u flag); the old
// \w stripped every non-ASCII character, wiping out Chinese labels entirely.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
