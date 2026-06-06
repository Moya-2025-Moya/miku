export interface ProfileRow {
  id: string;
  user_id: string;
  name: string;
  relationship_type: string | null;
  source: string;
  context_notes: string | null;
  feelings: string | null;
  avatar_emoji: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  profile_id: string;
  sender: string;
  body: string;
  sent_at: string | null;
  source: string;
  annotation: string | null;
  archived_at: string;
}

export interface PatternRow {
  id: string;
  profile_id: string;
  label: string;
  detail: string | null;
  evidence_count: number;
  confidence: string;
  first_observed: string;
  last_observed: string;
}

export interface AnalysisRow {
  id: string;
  profile_id: string;
  input_messages: unknown;
  user_reaction: string | null;
  vibe_read: string | null;
  reality_check: string | null;
  response_options: unknown;
  verdict: string | null;
  confidence: string | null;
  referenced_history: unknown;
  language: string | null;
  created_at: string;
}
