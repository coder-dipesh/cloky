/**
 * Hours and shift calculations.
 */

import { parseTimeToMinutes } from './utils.js';
import { TAX_HOURS_EXCLUDED } from './config.js';

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

/**
 * Hours used for pay after excluding a fixed tax-hour allowance.
 * First TAX_HOURS_EXCLUDED hours do not count toward pay; anything above does.
 *
 * @param {number} grossHours Sum of all shift hours
 * @param {number} [rate=0] Hourly rate for earned amount
 * @returns {{
 *   grossHours: number,
 *   taxCap: number,
 *   taxHoursApplied: number,
 *   taxHoursRemaining: number,
 *   payableHours: number,
 *   taxProgressPct: number,
 *   isTaxCleared: boolean,
 *   totalEarned: number
 * }}
 */
export function payableHoursFromGross(grossHours, rate = 0) {
  const gross = Math.max(0, Number(grossHours) || 0);
  const taxCap = TAX_HOURS_EXCLUDED;
  const taxHoursApplied = Math.min(taxCap, gross);
  const taxHoursRemaining = Math.max(0, taxCap - gross);
  const payableHours = Math.max(0, gross - taxCap);
  const taxProgressPct = taxCap > 0 ? Math.min(100, (taxHoursApplied / taxCap) * 100) : 100;
  const numRate = Number(rate) || 0;

  return {
    grossHours: gross,
    taxCap,
    taxHoursApplied,
    taxHoursRemaining,
    payableHours,
    taxProgressPct,
    isTaxCleared: taxHoursRemaining <= 0.0001,
    totalEarned: payableHours * numRate,
  };
}
