import { db } from "../db";
import type { MessageRow } from "../types";

export interface ArchiveInput {
  profileId: string;
  messages: { sender: string; body: string; sent_at?: string }[];
  annotation?: string;
  source?: string;
}

export async function archiveMessages(input: ArchiveInput): Promise<MessageRow[]> {
  const rows = input.messages.map((m) => ({
    profile_id: input.profileId,
    sender: m.sender,
    body: m.body,
    sent_at: m.sent_at ?? null,
    annotation: input.annotation ?? null,
    source: input.source ?? "native",
  }));
  const { data, error } = await db.from("messages").insert(rows).select();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listArchive(profileId: string, limit = 200): Promise<MessageRow[]> {
  const { data, error } = await db
    .from("messages")
    .select("*")
    .eq("profile_id", profileId)
    .order("archived_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateMessage(
  id: string,
  updates: Partial<Pick<MessageRow, "annotation" | "body" | "sender">>
): Promise<MessageRow | null> {
  const { data, error } = await db
    .from("messages")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  return data;
}

export async function deleteMessage(id: string): Promise<boolean> {
  const { error } = await db.from("messages").delete().eq("id", id);
  return !error;
}
