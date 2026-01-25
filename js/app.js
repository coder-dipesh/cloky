/**
 * Main Application - Pay Calculator
 * 
 * Initializes the application and ties together all modules
 */

// Import all modules
import * as Config from './config.js';
import * as Storage from './storage.js';
import * as Utils from './utils.js';
import * as Calculations from './calculations.js';
import * as UI from './ui.js';
import * as Forms from './forms.js';
import * as Theme from './theme.js';
import { exportToPDF } from './pdf-export.js';

// Import render functions (will be created inline for now due to circular dependencies)
// For now, we'll define render functions here that use the imported modules

// -----------------------------
// Elements
// -----------------------------
const els = {
  date: document.getElementById("date"),
  clockIn: document.getElementById("clockIn"),
  clockOut: document.getElementById("clockOut"),
  breakMin: document.getElementById("breakMin"),
  previewHours: document.getElementById("previewHours"),
  previewOvernight: document.getElementById("previewOvernight"),
  addBtn: document.getElementById("addBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  clearBtn: document.getElementById("clearBtn"),
  rows: document.getElementById("rows"),
  grandTotal: document.getElementById("grandTotal"),
  totalEarned: document.getElementById("totalEarned"),
  msg: document.getElementById("msg"),
  hourlyRate: document.getElementById("hourlyRate"),

  weekStart: document.getElementById("weekStart"),
  weekHours: document.getElementById("weekHours"),
  weekEarned: document.getElementById("weekEarned"),
  weekShifts: document.getElementById("weekShifts"),
  weekThisBtn: document.getElementById("weekThisBtn"),
  weekPrevBtn: document.getElementById("weekPrevBtn"),
  weekNextBtn: document.getElementById("weekNextBtn"),

  statLongest: document.getElementById("statLongest"),
  statAverage: document.getElementById("statAverage"),
  statBestDay: document.getElementById("statBestDay"),
  statWeekDeltaHours: document.getElementById("statWeekDeltaHours"),
  statWeekDeltaEarned: document.getElementById("statWeekDeltaEarned"),

  themeToggle: document.getElementById("themeToggle"),
  themeToggleLabel: document.getElementById("themeToggleLabel"),
  themeIconSun: document.getElementById("themeIconSun"),
  themeIconMoon: document.getElementById("themeIconMoon"),
  todayChip: document.getElementById("todayChip"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),

  fortnightRange: document.getElementById("fortnightRange"),
  fortnightPrevBtn: document.getElementById("fortnightPrevBtn"),
  fortnightThisBtn: document.getElementById("fortnightThisBtn"),
  fortnightNextBtn: document.getElementById("fortnightNextBtn"),
};

// -----------------------------
// State
// -----------------------------
let editingId = null;
let currentFortnightStart = null; // ISO date string for the start of the current fortnight

// -----------------------------
// Helper functions that use imported modules
// -----------------------------
function setMessage(text, type = "ok", autoHide = true) {
  UI.setMessage(els, text, type, autoHide);
}

function updateTodayChip() {
  UI.updateTodayChip(els, Utils.todayISO);
}

function updatePreview() {
  updateTodayChip();

  const inT = els.clockIn.value;
  const outT = els.clockOut.value;
  const breakMin = Number(els.breakMin.value || 0);

  if (!inT || !outT) {
    els.previewHours.textContent = "0.00";
    els.previewOvernight.classList.add("hidden");
    return;
  }

  const meta = Calculations.calcHoursMeta(inT, outT, breakMin);
  els.previewHours.textContent = Utils.fmtHours(meta.hours);

  if (meta.isOvernight) els.previewOvernight.classList.remove("hidden");
  else els.previewOvernight.classList.add("hidden");
}

function setWeekStartToDate(dateISO) {
  const monday = Utils.mondayOf(Utils.parseISODateLocal(dateISO));
  els.weekStart.value = Utils.isoFromDate(monday);
}

function renderWeeklySummary(entries) {
  const rate = Storage.loadHourlyRate();
  const weekISO = els.weekStart.value;

  if (!weekISO) {
    els.weekHours.textContent = "0.00";
    els.weekEarned.textContent = "$0.00";
    els.weekShifts.textContent = "0";
    return { weekHours: 0, weekShifts: 0, weekEarned: 0 };
  }

  let weekHours = 0;
  let weekShifts = 0;

  for (const e of entries) {
    if (Utils.shiftFallsInWeek(e.date, weekISO)) {
      weekHours += e.totalHours;
      weekShifts += 1;
    }
  }

  const weekEarned = weekHours * rate;

  els.weekHours.textContent = Utils.fmtHours(weekHours);
  els.weekEarned.textContent = Utils.fmtMoney(weekEarned);
  els.weekShifts.textContent = String(weekShifts);

  return { weekHours, weekShifts, weekEarned };
}

function renderInsights(entries) {
  // Longest + average
  let longest = 0;
  let total = 0;
  for (const e of entries) {
    if (e.totalHours > longest) longest = e.totalHours;
    total += e.totalHours;
  }
  const avg = entries.length ? (total / entries.length) : 0;

  els.statLongest.textContent = Utils.fmtHours(longest);
  els.statAverage.textContent = Utils.fmtHours(avg);

  const best = Calculations.computeMostWorkedDay(entries, Utils.parseISODateLocal);
  els.statBestDay.textContent = best.day;

  // Week-to-week comparison
  const rate = Storage.loadHourlyRate();
  const weekISO = els.weekStart.value;

  if (!weekISO) {
    els.statWeekDeltaHours.textContent = "0.00";
    els.statWeekDeltaEarned.textContent = "$0.00";
    return;
  }

  // Selected week totals
  let thisWeekHours = 0;
  for (const e of entries) {
    if (Utils.shiftFallsInWeek(e.date, weekISO)) thisWeekHours += e.totalHours;
  }

  // Previous week (weekStart - 7 days)
  const prevStart = Utils.parseISODateLocal(weekISO);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevISO = Utils.isoFromDate(prevStart);

  let prevWeekHours = 0;
  for (const e of entries) {
    if (Utils.shiftFallsInWeek(e.date, prevISO)) prevWeekHours += e.totalHours;
  }

  const deltaHours = thisWeekHours - prevWeekHours;
  const deltaEarned = deltaHours * rate;

  els.statWeekDeltaHours.textContent = Utils.fmtHours(deltaHours);
  els.statWeekDeltaEarned.textContent = Utils.fmtMoney(deltaEarned);

  // Add subtle +/- coloring
  els.statWeekDeltaHours.className = "";
  els.statWeekDeltaEarned.className = "";
  const positive = deltaHours > 0.0001;
  const negative = deltaHours < -0.0001;

  const cls = positive
    ? "text-emerald-600"
    : negative
      ? "text-red-600"
      : "text-slate-500 dark:text-slate-400";

  const parts = cls.split(" ");
  els.statWeekDeltaHours.classList.add(...parts);
  els.statWeekDeltaEarned.classList.add(...parts);
}

// Initialize or update current fortnight to show the most recent fortnight with data
function initializeFortnight(entries) {
  if (currentFortnightStart) return; // Already initialized

  if (entries.length === 0) {
    // No data, use today's date as the start
    currentFortnightStart = Utils.isoFromDate(Utils.fortnightStartOf(new Date()));
    return;
  }

  // Find the most recent entry date
  const mostRecentDate = entries[0].date; // entries are sorted by date desc
  currentFortnightStart = Utils.isoFromDate(Utils.fortnightStartOf(Utils.parseISODateLocal(mostRecentDate)));
}

function render() {
  let entries = Storage.pruneOldEntries(Storage.loadEntries(), setMessage);

  // Sort by date desc, then createdAt desc
  entries.sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt - a.createdAt));

  // Initialize fortnight if needed
  initializeFortnight(entries);

  // Filter entries to current fortnight
  const fortnightEntries = currentFortnightStart
    ? entries.filter(e => Utils.shiftFallsInFortnight(e.date, currentFortnightStart))
    : [];

  // Update fortnight range display
  if (currentFortnightStart) {
    els.fortnightRange.textContent = Utils.formatFortnightRange(currentFortnightStart);
  } else {
    els.fortnightRange.textContent = "—";
  }

  // Table rows
  els.rows.innerHTML = "";
  let totalHours = 0;

  const rate = Storage.loadHourlyRate();

  if (fortnightEntries.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="7" class="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
        ${entries.length === 0 
          ? "No shifts yet. Add your first one." 
          : "No shifts in this pay cycle."}
      </td>
    `;
    els.rows.appendChild(tr);
  } else {
    for (const e of fortnightEntries) {
      totalHours += e.totalHours;

      const overnight = (() => {
        try {
          const inM = Utils.parseTimeToMinutes(e.clockIn);
          const outM = Utils.parseTimeToMinutes(e.clockOut);
          return outM < inM;
        } catch { return false; }
      })();

      const earned = e.totalHours * rate;

      const dayName = Utils.getDayName(e.date);
      const clockIn12 = Utils.formatTime12Hour(e.clockIn);
      const clockOut12 = Utils.formatTime12Hour(e.clockOut);
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="px-5 py-3 whitespace-nowrap">
          <div class="flex flex-col gap-0.5">
            <span class="font-medium">${e.date}</span>
            <span class="text-xs text-slate-500 dark:text-slate-400">${dayName}</span>
          </div>
        </td>
        <td class="px-5 py-3 whitespace-nowrap">${clockIn12}</td>
        <td class="px-5 py-3 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <span>${clockOut12}</span>
            ${overnight ? `
              <span class="text-[11px] px-2 py-0.5 rounded-full border border-slate-300 bg-slate-50 text-slate-700
                           dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                Overnight
              </span>
            ` : ``}
          </div>
        </td>
        <td class="px-5 py-3 whitespace-nowrap">${e.breakMin} min</td>
        <td class="px-5 py-3 whitespace-nowrap font-medium">${Utils.fmtHours(e.totalHours)}</td>
        <td class="px-5 py-3 whitespace-nowrap font-medium">${Utils.fmtMoney(earned)}</td>
        <td class="px-5 py-3 text-right whitespace-nowrap">
          <button data-id="${e.id}"
            class="editBtn rounded-lg px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-100
                   dark:border-slate-700 dark:hover:bg-slate-950">
            Edit
          </button>
          <button data-id="${e.id}"
            class="deleteBtn rounded-lg px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-100 ml-2
                   dark:border-slate-700 dark:hover:bg-slate-950">
            Delete
          </button>
        </td>
      `;
      els.rows.appendChild(tr);
    }
  }

  // Update totals (for current fortnight only)
  els.grandTotal.textContent = Utils.fmtHours(totalHours);
  els.totalEarned.textContent = Utils.fmtMoney(totalHours * rate);

  // Weekly summary + insights
  renderWeeklySummary(entries);
  renderInsights(entries);

  // Wire edit/delete buttons
  document.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const next = Storage.loadEntries().filter(e => e.id !== id);
      Storage.saveEntries(next, setMessage);

      if (editingId === id) {
        editingId = null;
        Forms.resetEditMode(els, updatePreview, Utils.todayISO);
      }

      render();
      setMessage("Shift deleted.");
    });
  });

  document.querySelectorAll(".editBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const entry = Storage.loadEntries().find(e => e.id === id);
      if (!entry) return;

      editingId = id;
      els.date.value = entry.date;
      els.clockIn.value = entry.clockIn;
      els.clockOut.value = entry.clockOut;
      els.breakMin.value = String(entry.breakMin);

      els.addBtn.textContent = "Update Shift";
      els.cancelEditBtn.classList.remove("hidden");

      setWeekStartToDate(entry.date);

      updatePreview();
      setMessage("Editing shift. Make changes and click Update Shift.", "warn");
    });
  });
}

function clearFieldsAfterAddOrUpdate(keepDateISO = null) {
  els.date.value = keepDateISO || Utils.todayISO();
  els.clockIn.value = "";
  els.clockOut.value = "";
  els.breakMin.value = "0";
  updatePreview();
}

function resetEditMode() {
  editingId = null;
  Forms.resetEditMode(els, updatePreview, Utils.todayISO);
}

function validateAndCompute() {
  return Forms.validateAndCompute(els, setMessage);
}

function upsertShift() {
  const computed = validateAndCompute();
  if (!computed) return;

  const entries = Storage.pruneOldEntries(Storage.loadEntries(), setMessage);

  if (editingId) {
    const idx = entries.findIndex(e => e.id === editingId);
    if (idx === -1) {
      setMessage("Couldn't find that shift to update. Try again.", "err");
      resetEditMode();
      render();
      return;
    }

    entries[idx] = {
      ...entries[idx],
      date: computed.date,
      clockIn: computed.clockIn,
      clockOut: computed.clockOut,
      breakMin: computed.breakMin,
      totalHours: computed.totalHours,
    };

    Storage.saveEntries(entries, setMessage);
    setWeekStartToDate(computed.date);
    setFortnightToDate(computed.date);
    render();
    setMessage("Shift updated.");
    resetEditMode();
    return;
  }

  const entry = {
    id: (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(16).slice(2),
    date: computed.date,
    clockIn: computed.clockIn,
    clockOut: computed.clockOut,
    breakMin: computed.breakMin,
    totalHours: computed.totalHours,
    createdAt: Date.now(),
  };

  entries.push(entry);
  Storage.saveEntries(entries, setMessage);
  setWeekStartToDate(entry.date);
  setFortnightToDate(entry.date);
  render();
  setMessage("Shift saved.");
  clearFieldsAfterAddOrUpdate(Utils.todayISO());
}

function setWeekToThisWeek() {
  const monday = Utils.mondayOf(new Date());
  els.weekStart.value = Utils.isoFromDate(monday);
  render();
}

function shiftWeekBy(deltaDays) {
  if (!els.weekStart.value) {
    setWeekToThisWeek();
    return;
  }
  const d = Utils.parseISODateLocal(els.weekStart.value);
  d.setDate(d.getDate() + deltaDays);
  els.weekStart.value = Utils.isoFromDate(d);
  render();
}

// Fortnight navigation functions
function setFortnightToCurrent() {
  const today = new Date();
  currentFortnightStart = Utils.isoFromDate(Utils.fortnightStartOf(today));
  render();
}

function setFortnightToDate(dateISO) {
  currentFortnightStart = Utils.isoFromDate(Utils.fortnightStartOf(Utils.parseISODateLocal(dateISO)));
  render();
}

function shiftFortnightBy(deltaDays) {
  if (!currentFortnightStart) {
    setFortnightToCurrent();
    return;
  }
  const d = Utils.parseISODateLocal(currentFortnightStart);
  
  // Navigate by 14 days, then recalculate the proper fortnight start (1st or 15th)
  d.setDate(d.getDate() + deltaDays);
  currentFortnightStart = Utils.isoFromDate(Utils.fortnightStartOf(d));
  render();
}

function handleExportPDF() {
  exportToPDF(
    els,
    setMessage,
    Storage.pruneOldEntries,
    Storage.loadEntries,
    Storage.loadHourlyRate,
    Utils.getDayName,
    Utils.parseTimeToMinutes,
    Utils.formatTime12Hour,
    Utils.fmtHours,
    Utils.fmtMoney,
    Utils.todayISO
  );
}

// -----------------------------
// Init
// -----------------------------
els.date.value = Utils.todayISO();
updateTodayChip();

// Set default weekly start = Monday of today
setWeekToThisWeek();

// Load hourly rate
els.hourlyRate.value = Storage.loadHourlyRate() || "";

// Load theme
Theme.applyTheme(els, Theme.loadTheme());

// -----------------------------
// Events
// -----------------------------
["input", "change"].forEach(evt => {
  els.clockIn.addEventListener(evt, updatePreview);
  els.clockOut.addEventListener(evt, updatePreview);
  els.breakMin.addEventListener(evt, updatePreview);
  els.date.addEventListener(evt, () => {
    updatePreview();
    updateTodayChip();
  });
});

els.addBtn.addEventListener("click", upsertShift);

els.cancelEditBtn.addEventListener("click", () => {
  resetEditMode();
  setMessage("Edit cancelled.");
});

els.clearBtn.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Are you sure you want to clear all saved shift data? This action cannot be undone."
  );
  
  if (!confirmed) {
    return; // User cancelled, do nothing
  }
  
  Storage.clearAllEntries();
  resetEditMode();
  render();
  setMessage("All saved shift data cleared.");
  updatePreview();
});

els.exportPdfBtn.addEventListener("click", handleExportPDF);

els.hourlyRate.addEventListener("input", () => {
  const rate = Number(els.hourlyRate.value || 0);
  Storage.saveHourlyRate(rate);
  render();
});

els.weekStart.addEventListener("change", () => {
  render();
});

els.weekThisBtn.addEventListener("click", setWeekToThisWeek);
els.weekPrevBtn.addEventListener("click", () => shiftWeekBy(-7));
els.weekNextBtn.addEventListener("click", () => shiftWeekBy(7));

els.fortnightThisBtn.addEventListener("click", setFortnightToCurrent);
els.fortnightPrevBtn.addEventListener("click", () => shiftFortnightBy(-14));
els.fortnightNextBtn.addEventListener("click", () => shiftFortnightBy(14));

els.themeToggle.addEventListener("click", () => Theme.toggleTheme(els));

// First paint
updatePreview();
render();
