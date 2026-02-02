/**
 * Writes js/supabase-config.js from env vars (for Vercel build).
 * Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables.
 * Build command: node scripts/write-supabase-config.js
 */

const fs = require("fs");
const path = require("path");

const url = process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_ANON_KEY || "";

const content = `/**
 * Supabase configuration (generated at build time)
 */
export const SUPABASE_URL = ${JSON.stringify(url)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(key)};
`;

const outPath = path.join(__dirname, "..", "js", "supabase-config.js");
fs.writeFileSync(outPath, content, "utf8");
console.log("Wrote", outPath);
