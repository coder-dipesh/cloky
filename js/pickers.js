/**
 * Date picker (Flatpickr) and custom time wheel for clock in/out.
 */

import { initCustomTimePickers } from './custom-time-picker.js';

const flatpickr = typeof window !== "undefined" ? window.flatpickr : null;
const instances = new WeakMap();

/** Set an input's value and keep its picker instance in sync. */
export function setFlatpickrValue(el, value) {
  if (!el) return;
  el.value = value || "";
  const inst = instances.get(el);
  if (inst) {
    if (typeof inst.setVal === "function") {
      try { inst.setVal(value || null); } catch (_) {}
    } else if (inst.setDate) {
      inst.setDate(value || null, false);
    }
  }
}

/** Initialize date picker (Flatpickr) and custom time wheels for clock in/out. */
export function initPickers(els) {
  if (!els) return;
  initCustomTimePickers(els);
  if (flatpickr && els.date) {
    const fp = flatpickr(els.date, {
      allowInput: true,
      disableMobile: true,
      dateFormat: "Y-m-d",
    });
    if (fp) instances.set(els.date, fp);
  }
}
