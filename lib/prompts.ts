import type { ProfileRow, MessageRow, PatternRow, AnalysisRow } from "./types";

export const SYSTEM_PROMPT = `You are ScreenRead — a social-dynamics interpreter, not a therapist or manipulation coach.

For each analysis, produce exactly four outputs:
1. Vibe Read: What is really being said beneath the surface? What's the tone, intent, subtext?
2. Reality Check: Is this reaction proportionate? Distinguish facts from assumptions. Flag overthinking or under-reaction.
3. Response Options: 2–3 ready-to-send reply drafts in different tones (casual, direct, boundary-setting as appropriate).
4. Verdict: One punchy line summarizing the read. Optimized for screenshotting.

Rules:
- Acknowledge genuine ambiguity; don't force false certainty
- Never catastrophize or dismiss
- No therapy-speak or clinical framing
- Be the smart friend who tells you what they actually think
- Support both English and Chinese — match the language of the input messages
- When relevant history exists, weave it into the read without being asked, and calibrate confidence to how much corroboration you have (a cold read is low)
- Whenever you notice a recurring dynamic, record it in detected_patterns with: a short label, a one-sentence detail explaining the evidence, and your confidence (low/medium/high)`;

export const IMPORT_SYSTEM_PROMPT = `Extract messages from screenshots or pasted text.
- Label each message as "me" or "them"
- Preserve chronological order
- Suggest a contact name if it's inferable from the conversation
- For prose descriptions, summarize as a single message from "them"`;

function formatProfile(p: ProfileRow): string {
  const lines = [`Contact: ${p.name}`];
  if (p.relationship_type) lines.push(`Relationship: ${p.relationship_type}`);
  if (p.context_notes) lines.push(`Context: ${p.context_notes}`);
  if (p.feelings) lines.push(`Your feelings: ${p.feelings}`);
  return lines.join("\n");
}

function formatPatterns(patterns: PatternRow[]): string {
  if (!patterns.length) return "";
  return (
    "Observed patterns:\n" +
    patterns
      .map(
        (p) =>
          `- ${p.label} (confidence: ${p.confidence}, observed ${p.evidence_count}x)` +
          (p.detail ? `: ${p.detail}` : "")
      )
      .join("\n")
  );
}

function formatArchive(messages: MessageRow[]): string {
  if (!messages.length) return "";
  return (
    "Message archive (oldest first):\n" +
    [...messages]
      .reverse()
      .map(
        (m) =>
          `[${m.sender}] ${m.body}` + (m.annotation ? ` (note: ${m.annotation})` : "")
      )
      .join("\n")
  );
}

function formatPastAnalyses(analyses: AnalysisRow[]): string {
  if (!analyses.length) return "";
  return (
    "Past verdicts:\n" +
    analyses.map((a) => `- ${a.verdict} (${a.confidence})`).join("\n")
  );
}

export function buildAnalysisUserMessage(params: {
  profile: ProfileRow;
  patterns: PatternRow[];
  archive: MessageRow[];
  pastAnalyses: AnalysisRow[];
  messages: { sender: string; body: string }[];
  userReaction?: string;
}): string {
  const sections = [
    formatProfile(params.profile),
    formatPatterns(params.patterns),
    formatArchive(params.archive),
    formatPastAnalyses(params.pastAnalyses),
    "Current exchange:\n" + params.messages.map((m) => `[${m.sender}] ${m.body}`).join("\n"),
  ].filter(Boolean);

  if (params.userReaction) sections.push(`Your reaction: ${params.userReaction}`);

  return sections.join("\n\n");
}
