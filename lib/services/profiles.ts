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

export async function getProfile(id: string): Promise<ProfileRow | null> {
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
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
  input: z.infer<typeof updateProfileSchema>
): Promise<ProfileRow> {
  const validated = updateProfileSchema.parse(input);
  const { data, error } = await db
    .from("profiles")
    .update(validated)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProfile(id: string): Promise<boolean> {
  const { error } = await db.from("profiles").delete().eq("id", id);
  return !error;
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
