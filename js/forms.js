/**
 * Form Handling and Validation
 */

import { calcHoursMeta } from './calculations.js';
import { parseTimeToMinutes, todayISO, fmtHours } from './utils.js';
import { MAX_SHIFT_HOURS_WARN } from './config.js';

export function validateAndCompute(els, setMessage) {
  const date = els.date.value.trim();
  const clockIn = els.clockIn.value.trim();
  const clockOut = els.clockOut.value.trim();
  const breakMin = Number(els.breakMin.value || 0);

  if (!date || !clockIn || !clockOut) {
    setMessage(els, "Please fill Date, Clock in, and Clock out.", "err");
    return null;
  }
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
  els.date.value = keepDateISO || todayISO();
  els.clockIn.value = "";
  els.clockOut.value = "";
  els.breakMin.value = "0";
  updatePreview();
}

export function resetEditMode(els, updatePreview, todayISO) {
  els.addBtn.textContent = "Add Shift";
  els.cancelEditBtn.classList.add("hidden");
  clearFieldsAfterAddOrUpdate(els, updatePreview, todayISO());
}
