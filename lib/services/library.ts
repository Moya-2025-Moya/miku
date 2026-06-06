import { getDb } from "../db";

// The shape the relationship-library frontend works in. Kept 1:1 with the
// in-browser objects so the page can load/save without translation.
export interface LibraryEvent {
  id: string;
  title: string;
  date: string;
  tags: string[];
  msgs: { who: string; text: string }[];
  analysis: { happened?: string; trigger?: string; forward?: string } | null;
}

export interface LibraryProfile {
  id: string;
  name: string;
  type: string;
  initial: string;
  color: string;
  patterns: string[];
  tensions: string[];
  notes: string;
  impression_who: string;
  impression_behav: string;
  impression_feel: string;
  archive: LibraryEvent[];
}

interface ProfileDbRow {
  id: string;
  name: string;
  relationship_type: string | null;
  initial: string | null;
  color: string | null;
  patterns: string[] | null;
  tensions: string[] | null;
  context_notes: string | null;
  impression_who: string | null;
  impression_behav: string | null;
  impression_feel: string | null;
}

interface EventDbRow {
  id: string;
  profile_id: string;
  title: string | null;
  event_date: string | null;
  tags: string[] | null;
  msgs: LibraryEvent["msgs"] | null;
  analysis: LibraryEvent["analysis"];
  position: number;
}

// Full library for a user: every profile with its archive nested, ready to
// drop straight into the page's `profileData` map.
export async function getLibrary(userId: string): Promise<LibraryProfile[]> {
  const db = getDb();
  const { data: profiles, error: pErr } = await db
    .from("profiles")
    .select(
      "id,name,relationship_type,initial,color,patterns,tensions,context_notes,impression_who,impression_behav,impression_feel,created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (pErr) throw new Error(pErr.message);

  const ids = (profiles ?? []).map((p) => p.id);
  let events: EventDbRow[] = [];
  if (ids.length) {
    const { data: evs, error: eErr } = await db
      .from("events")
      .select("id,profile_id,title,event_date,tags,msgs,analysis,position")
      .in("profile_id", ids)
      .order("position", { ascending: true });
    if (eErr) throw new Error(eErr.message);
    events = (evs ?? []) as EventDbRow[];
  }

  return (profiles ?? []).map((p: ProfileDbRow) => ({
    id: p.id,
    name: p.name,
    type: p.relationship_type ?? "contact",
    initial: p.initial ?? (p.name?.[0] ?? "?").toUpperCase(),
    color: p.color ?? "linear-gradient(135deg,#c79be8,#9b6be2)",
    patterns: p.patterns ?? [],
    tensions: p.tensions ?? [],
    notes: p.context_notes ?? "",
    impression_who: p.impression_who ?? "",
    impression_behav: p.impression_behav ?? "",
    impression_feel: p.impression_feel ?? "",
    archive: events
      .filter((e) => e.profile_id === p.id)
      .map((e) => ({
        id: e.id,
        title: e.title ?? "Untitled event",
        date: e.event_date ?? "",
        tags: e.tags ?? [],
        msgs: e.msgs ?? [],
        analysis: e.analysis ?? null,
      })),
  }));
}

// Persist one profile's full state: upsert the profile row, upsert its events
// (keyed by the frontend-supplied uuid so ids stay stable), then drop any
// events that are no longer present. This is the single write path the page
// uses after any local mutation — optimistic UI, authoritative DB.
export async function saveProfileState(
  userId: string,
  p: LibraryProfile
): Promise<void> {
  const db = getDb();

  const { error: pErr } = await db.from("profiles").upsert(
    {
      id: p.id,
      user_id: userId,
      name: p.name,
      relationship_type: p.type,
      initial: p.initial,
      color: p.color,
      patterns: p.patterns ?? [],
      tensions: p.tensions ?? [],
      context_notes: p.notes ?? "",
      impression_who: p.impression_who ?? "",
      impression_behav: p.impression_behav ?? "",
      impression_feel: p.impression_feel ?? "",
    },
    { onConflict: "id" }
  );
  if (pErr) throw new Error(pErr.message);

  const archive = p.archive ?? [];
  if (archive.length) {
    const rows = archive.map((e, i) => ({
      id: e.id,
      profile_id: p.id,
      title: e.title ?? "Untitled event",
      event_date: e.date ?? "",
      tags: e.tags ?? [],
      msgs: e.msgs ?? [],
      analysis: e.analysis ?? null,
      position: i,
    }));
    const { error: eErr } = await db.from("events").upsert(rows, { onConflict: "id" });
    if (eErr) throw new Error(eErr.message);
  }

  // Delete events that belong to this profile but are no longer in the archive.
  const keepIds = archive.map((e) => e.id);
  let del = db.from("events").delete().eq("profile_id", p.id);
  if (keepIds.length) {
    del = del.not("id", "in", `(${keepIds.join(",")})`);
  }
  const { error: dErr } = await del;
  if (dErr) throw new Error(dErr.message);
}

export async function deleteLibraryProfile(
  id: string,
  userId: string
): Promise<boolean> {
  const { error } = await getDb()
    .from("profiles")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}
