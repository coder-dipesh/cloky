/**
 * Form validation and shift field helpers.
 */

import { calcHoursMeta } from './calculations.js';
import { parseTimeToMinutes, todayISO, fmtHours, pad2 } from './utils.js';
import { MAX_SHIFT_HOURS_WARN } from './config.js';
import * as Pickers from './pickers.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Normalize "9:0", "9:00", "09:00" to "09:00" for storage. */
function normalizeTime(str) {
  const m = str.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  const h = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  const min = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return `${pad2(h)}:${pad2(min)}`;
}

export function validateAndCompute(els, setMessage) {
  const dateRaw = els.date.value.trim();
  const clockInRaw = els.clockIn.value.trim();
  const clockOutRaw = els.clockOut.value.trim();
  const breakMin = Number(els.breakMin.value || 0);

  if (!dateRaw || !clockInRaw || !clockOutRaw) {
    setMessage(els, "Please fill Date, Clock in, and Clock out.", "err");
    return null;
  }
  if (!DATE_REGEX.test(dateRaw)) {
    setMessage(els, "Date must be YYYY-MM-DD (e.g. 2026-03-14).", "err");
    return null;
  }
  const clockIn = normalizeTime(clockInRaw);
  const clockOut = normalizeTime(clockOutRaw);
  if (!clockIn || !clockOut) {
    setMessage(els, "Clock in and Clock out must be HH:MM (e.g. 09:00 or 17:30).", "err");
    return null;
  }
  const date = dateRaw;
  if (Number.isNaN(breakMin) || breakMin < 0) {
    setMessage(els, "Break minutes must be 0 or more.", "err");
    return null;
  }
  if (clockIn === clockOut) {
    setMessage(els, "Clock in and clock out are the same (0 hours shift). Please double-check.", "err");
    return null;
  }

  // Raw worked minutes (before break clamp)
  const inMin = parseTimeToMinutes(clockIn);
  let outMin = parseTimeToMinutes(clockOut);
  if (outMin < inMin) outMin += 24 * 60;
  const workedMin = outMin - inMin;

  if (breakMin > workedMin) {
    setMessage(els, "Break is longer than the shift time. Net hours will be 0.00.", "warn");
  }

  const meta = calcHoursMeta(clockIn, clockOut, breakMin);

  if (meta.hours > MAX_SHIFT_HOURS_WARN) {
    setMessage(els, `That's a long shift (${fmtHours(meta.hours)} hrs). If that's correct, you can still save it.`, "warn");
  }

  return {
    date,
    clockIn,
    clockOut,
    breakMin,
    totalHours: meta.hours,
    isOvernight: meta.isOvernight,
    workedMin: meta.workedMin
  };
}

export function clearFieldsAfterAddOrUpdate(els, updatePreview, keepDateISO = null) {
  Pickers.setFlatpickrValue(els.date, keepDateISO || todayISO());
  Pickers.setFlatpickrValue(els.clockIn, "");
  Pickers.setFlatpickrValue(els.clockOut, "");
  els.breakMin.value = "0";
  updatePreview();
}

export function resetEditMode(els, updatePreview, todayISO) {
  els.addBtn.textContent = "Add Shift";
  els.cancelEditBtn.classList.add("hidden");
  clearFieldsAfterAddOrUpdate(els, updatePreview, todayISO());
}
