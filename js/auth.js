/**
 * Authentication (Supabase email + password)
 */

import { getSupabase } from "./supabase-client.js";

/** @returns {Promise<{ user: object } | null>} */
export async function getSession() {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    console.error("Auth getSession error:", error);
    return null;
  }
  return session;
}

/** @returns {Promise<string | null>} User ID or null */
export async function getUserId() {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/**
 * Sign in with email + password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ error: Error | null }>}
 */
export async function signInWithPassword(email, password) {
  const supabase = await getSupabase();
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  return { error };
}

/**
 * Create account with email + password
 * Note: If email confirmations are enabled in Supabase, the user must confirm via email before signing in.
 * @param {string} email
 * @param {string} password
 * @param {string} [redirectTo] Optional URL used for email confirmations (default: current origin/path)
 * @returns {Promise<{ error: Error | null }>}
 */
export async function signUpWithPassword(email, password, redirectTo) {
  const supabase = await getSupabase();
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }
  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: redirectTo || window.location.origin + window.location.pathname,
    },
  });
  return { error };
}

/** Sign out current user */
export async function signOut() {
  const supabase = await getSupabase();
  if (supabase) await supabase.auth.signOut();
}

/**
 * Subscribe to auth state changes (e.g. user signs in via magic link)
 * @param {(session: { user: object } | null) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  let unsub = () => {};
  getSupabase().then((supabase) => {
    if (!supabase) {
      callback(null);
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    unsub = () => subscription.unsubscribe();
  });
  return () => unsub();
}
