/**
 * Seeds the relationship library for the demo user.
 *
 *   npx tsx scripts/seed-library.ts          # seed only if empty
 *   npx tsx scripts/seed-library.ts --force  # wipe demo-user library and reseed
 *
 * Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { SEED_PROFILES, migrateAnalysis } from "../lib/seed-data";

// Minimal .env loader so the script runs without extra deps.
function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* rely on ambient env */
  }
}

async function main() {
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const force = process.argv.includes("--force");
  const userId = "demo-user";
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: existing, error: exErr } = await db
    .from("profiles")
    .select("id")
    .eq("user_id", userId);
  if (exErr) throw new Error(exErr.message);

  if (existing && existing.length) {
    if (!force) {
      console.log(
        `Found ${existing.length} existing profiles for ${userId}. Use --force to wipe and reseed. Aborting.`
      );
      return;
    }
    console.log(`--force: deleting ${existing.length} existing profiles (events cascade)…`);
    const { error } = await db.from("profiles").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
  }

  let eventCount = 0;
  for (const p of SEED_PROFILES) {
    const profileId = randomUUID();
    const { error: pErr } = await db.from("profiles").insert({
      id: profileId,
      user_id: userId,
      name: p.name,
      relationship_type: p.type,
      initial: p.initial,
      color: p.color,
      patterns: p.patterns,
      tensions: p.tensions,
      context_notes: p.notes,
      source: "native",
    });
    if (pErr) throw new Error(`profile ${p.name}: ${pErr.message}`);

    const rows = p.archive.map((e, i) => ({
      id: randomUUID(),
      profile_id: profileId,
      title: e.title,
      event_date: e.date,
      tags: e.tags,
      msgs: e.msgs,
      analysis: migrateAnalysis(e.analysis),
      position: i,
    }));
    if (rows.length) {
      const { error: eErr } = await db.from("events").insert(rows);
      if (eErr) throw new Error(`events for ${p.name}: ${eErr.message}`);
      eventCount += rows.length;
    }
    console.log(`  ✓ ${p.name} (${rows.length} events)`);
  }

  console.log(`Seeded ${SEED_PROFILES.length} profiles, ${eventCount} events for ${userId}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
