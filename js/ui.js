/**
 * UI Utilities - Messages and UI Helpers
 */

let msgTimer = null;

export function setMessage(els, text, type = "ok", autoHide = true) {
  if (msgTimer) clearTimeout(msgTimer);

  els.msg.textContent = text || "";
  els.msg.className = "mt-3 text-sm";

  if (!text) return;

  if (type === "err") {
    els.msg.classList.add("text-red-600");
  } else if (type === "warn") {
    els.msg.classList.add("text-amber-600");
  } else {
    els.msg.classList.add("text-emerald-700");
  }

  if (autoHide) {
    msgTimer = setTimeout(() => {
      els.msg.textContent = "";
    }, 2600);
  }
}

export function updateTodayChip(els, todayISO) {
  const isToday = els.date.value === todayISO();
  els.todayChip.classList.toggle("hidden", !isToday);
}
