/**
 * Data layer: Supabase when authenticated, otherwise no data (login required).
 * All functions are async.
 */

import { getSupabase } from "./supabase-client.js";
import { getUserId } from "./auth.js";
import { THIRTY_DAYS_MS } from "./config.js";

function rowToEntry(row) {
  return {
    id: row.id,
    date: row.date,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    breakMin: row.break_min,
    totalHours: Number(row.total_hours),
    createdAt: new Date(row.created_at).getTime(),
  };
}

function entryToRow(entry) {
  return {
    id: entry.id,
    date: entry.date,
    clock_in: entry.clockIn,
    clock_out: entry.clockOut,
    break_min: entry.breakMin ?? 0,
    total_hours: entry.totalHours,
    ...(entry.createdAt && { created_at: new Date(entry.createdAt).toISOString() }),
  };
}

/** @returns {Promise<Array>} */
export async function loadEntries() {
  const supabase = await getSupabase();
  const userId = await getUserId();
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadEntries error:", error);
    return [];
  }
  const raw = (data || []).map(rowToEntry);
  const seen = new Set();
  const entries = raw.filter((e) => {
    const key = `${e.date}|${e.clockIn}|${e.clockOut}|${e.breakMin}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // If DB had duplicates, persist deduped list once so they stop accumulating
  if (entries.length < raw.length) {
    saveEntries(entries).catch(() => {});
  }
  return entries;
}

/**
 * Replace all shifts for the current user with the given entries.
 * @param {Array} entries
 * @param {(string, string, boolean?) => void} [setMessage]
 */
export async function saveEntries(entries, setMessage = null) {
  const supabase = await getSupabase();
  const userId = await getUserId();
  if (!supabase || !userId) return;

  try {
    await supabase.from("shifts").delete().eq("user_id", userId);

    if (entries.length > 0) {
      const rows = entries.map((e) => ({
        ...entryToRow(e),
        user_id: userId,
      }));
      const { error } = await supabase.from("shifts").insert(rows);
      if (error) throw error;
    }
  } catch (e) {
    console.error("saveEntries error:", e);
    if (setMessage) {
      setMessage("Failed to save shifts. Please try again.", "err", false);
    }
  }
}

/**
 * Remove entries older than 30 days and return the fresh list.
 * @param {Array} entries
 * @param {(string, string, boolean?) => void} [setMessage]
 * @returns {Promise<Array>}
 */
export async function pruneOldEntries(entries, setMessage = null) {
  const now = Date.now();
  const fresh = entries.filter((e) => now - e.createdAt <= THIRTY_DAYS_MS);
  const toRemove = entries.filter((e) => now - e.createdAt > THIRTY_DAYS_MS);
  if (toRemove.length === 0) return fresh;

  const supabase = await getSupabase();
  const userId = await getUserId();
  if (supabase && userId && toRemove.length > 0) {
    const ids = toRemove.map((e) => e.id);
    await supabase.from("shifts").delete().in("id", ids).eq("user_id", userId);
  }
  return fresh;
}

/** @returns {Promise<number>} */
export async function loadHourlyRate() {
  const supabase = await getSupabase();
  const userId = await getUserId();
  if (!supabase || !userId) return 0;

  const { data, error } = await supabase
    .from("user_settings")
    .select("hourly_rate")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("loadHourlyRate error:", error);
    return 0;
  }
  return data ? Number(data.hourly_rate) : 0;
}

/** @param {number} rate */
export async function saveHourlyRate(rate) {
  const supabase = await getSupabase();
  const userId = await getUserId();
  if (!supabase || !userId) return;

  await supabase.from("user_settings").upsert(
    { user_id: userId, hourly_rate: Number(rate) },
    { onConflict: "user_id" }
  );
}

export async function clearAllEntries() {
  const supabase = await getSupabase();
  const userId = await getUserId();
  if (!supabase || !userId) return;
  await supabase.from("shifts").delete().eq("user_id", userId);
}

/**
 * Subscribe to shifts changes for the current user (multi-device sync).
 * @param {string} userId
 * @param {() => void} onUpdate Called when shifts change so app can re-fetch and re-render
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToShifts(userId, onUpdate) {
  let channel = null;
  getSupabase().then(async (supabase) => {
    if (!supabase || !userId) return;
    channel = supabase
      .channel("shifts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shifts",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();
  });
  return () => {
    if (channel) getSupabase().then((s) => s && s.removeChannel(channel));
  };
}
