/**
 * Writes js/supabase-config.js from env vars (for Vercel build).
 * Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables.
 * Build command: node scripts/write-supabase-config.js
 */

const fs = require("fs");
const path = require("path");

const url = (process.env.SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_ANON_KEY || "").trim();

if (!url || !key) {
  console.error("Missing env vars. In Vercel → Project → Settings → Environment Variables, add:");
  console.error("  SUPABASE_URL = your Supabase project URL");
  console.error("  SUPABASE_ANON_KEY = your Supabase anon key (Project Settings → API)");
  process.exit(1);
}

const content = `/**
 * Supabase configuration (generated at build time)
 */
export const SUPABASE_URL = ${JSON.stringify(url)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(key)};
`;

const outPath = path.join(__dirname, "..", "js", "supabase-config.js");
fs.writeFileSync(outPath, content, "utf8");
console.log("Wrote", outPath);
