/**
 * Business Logic - Hours Calculations and Week Calculations
 */

import { parseTimeToMinutes } from './utils.js';

// Returns { hours, isOvernight, workedMin, netMin }
export function calcHoursMeta(inStr, outStr, breakMinutes) {
  const inMin = parseTimeToMinutes(inStr);
  let outMin = parseTimeToMinutes(outStr);

  let isOvernight = false;
  if (outMin < inMin) {
    outMin += 24 * 60; // overnight
    isOvernight = true;
  }

  const workedMin = outMin - inMin;
  const netMin = Math.max(0, workedMin - breakMinutes);
  return {
    hours: netMin / 60,
    isOvernight,
    workedMin,
    netMin
  };
}

export function computeMostWorkedDay(entries, parseISODateLocal) {
  // Total hours per day of week (Mon-Sun)
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totals = new Map();

  for (const e of entries) {
    const d = parseISODateLocal(e.date);
    const key = names[d.getDay()];
    totals.set(key, (totals.get(key) || 0) + e.totalHours);
  }

  let best = null;
  let bestVal = -Infinity;
  for (const [k, v] of totals.entries()) {
    if (v > bestVal) {
      bestVal = v;
      best = k;
    }
  }
  return best ? { day: best, hours: bestVal } : { day: "—", hours: 0 };
}
