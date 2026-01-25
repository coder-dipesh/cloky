/**
 * LocalStorage Operations
 */

import { STORAGE_KEY, RATE_KEY, THIRTY_DAYS_MS } from './config.js';

export function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { 
    return JSON.parse(raw) || []; 
  } catch { 
    return []; 
  }
}

export function saveEntries(entries, setMessage = null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Failed to save entries:", e);
    if (setMessage) {
      setMessage("Your browser is blocking storage, so shifts can't be saved. Please check privacy settings.", "err", false);
    }
  }
}

export function pruneOldEntries(entries, setMessage = null) {
  const now = Date.now();
  const fresh = entries.filter(e => (now - e.createdAt) <= THIRTY_DAYS_MS);
  if (fresh.length !== entries.length) {
    saveEntries(fresh, setMessage);
  }
  return fresh;
}

export function loadHourlyRate() {
  const raw = localStorage.getItem(RATE_KEY);
  return raw ? Number(raw) : 0;
}

export function saveHourlyRate(rate) {
  localStorage.setItem(RATE_KEY, String(rate));
}

export function clearAllEntries() {
  localStorage.removeItem(STORAGE_KEY);
}
