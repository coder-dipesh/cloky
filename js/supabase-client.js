/**
 * Supabase client
 * Copy supabase-config.example.js to supabase-config.js and add your project URL and anon key.
 */

let client = null;
const initPromise = (async () => {
  try {
    const config = await import("./supabase-config.js");
    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2.45.0"
    );
    if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
      client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    }
  } catch (_) {
    // No supabase-config.js or load failed
  }
  return client;
})();

/** Returns the Supabase client or null if not configured. */
export async function getSupabase() {
  return initPromise;
}
