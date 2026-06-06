import { db } from "../db";
import { createProfileSchema, updateProfileSchema } from "../schemas";
import type { ProfileRow } from "../types";
import type { z } from "zod";

export async function listProfiles(userId: string): Promise<ProfileRow[]> {
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// userId is optional so the demo (single "demo-user") keeps working, but when
// supplied the query is scoped to the owner — preventing one user from reading
// another's relationship by guessing its id once the app goes multi-user.
export async function getProfile(
  id: string,
  userId?: string
): Promise<ProfileRow | null> {
  let q = db.from("profiles").select("*").eq("id", id);
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q.single();
  if (error) return null;
  return data;
}

export async function createProfile(
  userId: string,
  input: z.infer<typeof createProfileSchema>
): Promise<ProfileRow> {
  const validated = createProfileSchema.parse(input);
  const { data, error } = await db
    .from("profiles")
    .insert({ ...validated, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProfile(
  id: string,
  input: z.infer<typeof updateProfileSchema>,
  userId?: string
): Promise<ProfileRow> {
  const validated = updateProfileSchema.parse(input);
  let q = db.from("profiles").update(validated).eq("id", id);
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q.select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProfile(id: string, userId?: string): Promise<boolean> {
  let q = db.from("profiles").delete().eq("id", id);
  if (userId) q = q.eq("user_id", userId);
  const { error } = await q;
  return !error;
}

// Confirms a profile belongs to a user — used by sub-resource routes
// (archive / patterns / analyses / analyze) before they act on `id`.
export async function profileBelongsTo(id: string, userId: string): Promise<boolean> {
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function findProfileByName(
  userId: string,
  name: string
): Promise<ProfileRow | null> {
  const { data } = await db
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", `%${name}%`)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
