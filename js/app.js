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
import * as Auth from './auth.js';

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
  deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),
  selectAllCheckbox: document.getElementById("selectAllCheckbox"),

  loginSection: document.getElementById("loginSection"),
  appContent: document.getElementById("appContent"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginMsg: document.getElementById("loginMsg"),
  loginSubmitBtn: document.getElementById("loginSubmitBtn"),
  authSubtitle: document.getElementById("authSubtitle"),
  authModeToggleBtn: document.getElementById("authModeToggleBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
};

// -----------------------------
// State
// -----------------------------
let editingId = null;

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

function renderWeeklySummary(entries, rate) {
  const weekISO = els.weekStart.value;
  const numRate = Number(rate) || 0;

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

  const weekEarned = weekHours * numRate;

  els.weekHours.textContent = Utils.fmtHours(weekHours);
  els.weekEarned.textContent = Utils.fmtMoney(weekEarned);
  els.weekShifts.textContent = String(weekShifts);

  return { weekHours, weekShifts, weekEarned };
}

function renderInsights(entries, rate) {
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
  const numRate = Number(rate) || 0;
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
  const deltaEarned = deltaHours * numRate;

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

async function render() {
  let entries = await Storage.loadEntries();
  entries = await Storage.pruneOldEntries(entries, setMessage);

  // Sort by date desc, then createdAt desc
  entries.sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt - a.createdAt));

  // Table rows
  els.rows.innerHTML = "";
  let totalHours = 0;

  const rate = await Storage.loadHourlyRate();

  if (entries.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="8" class="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
        No shifts yet. Add your first one.
      </td>
    `;
    els.rows.appendChild(tr);
  } else {
    for (const e of entries) {
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
        <td class="w-10 px-3 py-3 text-center">
          <input type="checkbox" class="rowCheckbox rounded border-slate-300" data-id="${e.id}"
            aria-label="Select row" />
        </td>
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

  els.grandTotal.textContent = Utils.fmtHours(totalHours);
  els.totalEarned.textContent = Utils.fmtMoney(totalHours * rate);

  // Weekly summary + insights (use rate already loaded above)
  renderWeeklySummary(entries, rate);
  renderInsights(entries, rate);

  // Wire edit/delete buttons
  document.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const all = await Storage.loadEntries();
      const next = all.filter(e => e.id !== id);
      await Storage.saveEntries(next, setMessage);

      if (editingId === id) {
        editingId = null;
        Forms.resetEditMode(els, updatePreview, Utils.todayISO);
      }

      await render();
      setMessage("Shift deleted.");
    });
  });

  document.querySelectorAll(".editBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const all = await Storage.loadEntries();
      const entry = all.find(e => e.id === id);
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

  // Select-all checkbox
  if (els.selectAllCheckbox) {
    els.selectAllCheckbox.checked = false;
    els.selectAllCheckbox.onclick = () => {
      const checkboxes = els.rows.querySelectorAll(".rowCheckbox[data-id]");
      const checked = els.selectAllCheckbox.checked;
      checkboxes.forEach(cb => { cb.checked = checked; });
      updateDeleteSelectedVisibility();
    };
  }

  // Row checkboxes: show/hide Delete selected button
  els.rows.querySelectorAll(".rowCheckbox[data-id]").forEach(cb => {
    cb.addEventListener("change", updateDeleteSelectedVisibility);
  });

  // Reset selection state (hide Delete selected, uncheck Select all)
  updateDeleteSelectedVisibility();
}

function updateDeleteSelectedVisibility() {
  const checked = els.rows.querySelectorAll(".rowCheckbox[data-id]:checked");
  if (els.deleteSelectedBtn) {
    els.deleteSelectedBtn.classList.toggle("hidden", checked.length === 0);
  }
  if (els.selectAllCheckbox) {
    const all = els.rows.querySelectorAll(".rowCheckbox[data-id]");
    els.selectAllCheckbox.checked = all.length > 0 && checked.length === all.length;
    els.selectAllCheckbox.indeterminate = checked.length > 0 && checked.length < all.length;
  }
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

async function upsertShift() {
  const computed = validateAndCompute();
  if (!computed) return;

  const btn = els.addBtn;
  const wasDisabled = btn.disabled;
  btn.disabled = true;
  try {
    let entries = await Storage.loadEntries();
    entries = await Storage.pruneOldEntries(entries, setMessage);

  if (editingId) {
    const idx = entries.findIndex(e => e.id === editingId);
    if (idx === -1) {
      setMessage("Couldn't find that shift to update. Try again.", "err");
      resetEditMode();
      await render();
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

    await Storage.saveEntries(entries, setMessage);
    setWeekStartToDate(computed.date);
    await render();
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
  await Storage.saveEntries(entries, setMessage);
  setWeekStartToDate(entry.date);
  await render();
  setMessage("Shift saved.");
  clearFieldsAfterAddOrUpdate(Utils.todayISO());
  } finally {
    btn.disabled = wasDisabled;
  }
}

async function setWeekToThisWeek() {
  const monday = Utils.mondayOf(new Date());
  els.weekStart.value = Utils.isoFromDate(monday);
  await render();
}

async function shiftWeekBy(deltaDays) {
  if (!els.weekStart.value) {
    await setWeekToThisWeek();
    return;
  }
  const d = Utils.parseISODateLocal(els.weekStart.value);
  d.setDate(d.getDate() + deltaDays);
  els.weekStart.value = Utils.isoFromDate(d);
  await render();
}

async function handleExportPDF() {
  let entries = await Storage.loadEntries();
  entries = await Storage.pruneOldEntries(entries, setMessage);
  const rate = await Storage.loadHourlyRate();
  exportToPDF(
    els,
    setMessage,
    entries,
    rate,
    Utils.getDayName,
    Utils.parseTimeToMinutes,
    Utils.formatTime12Hour,
    Utils.fmtHours,
    Utils.fmtMoney,
    Utils.todayISO
  );
}

// -----------------------------
// Auth UI
// -----------------------------
function resetAuthForm() {
  if (els.loginEmail) els.loginEmail.value = "";
  if (els.loginPassword) els.loginPassword.value = "";
  if (els.loginMsg) {
    els.loginMsg.textContent = "";
    els.loginMsg.className = "auth-field-enter text-sm mb-3 min-h-[1.25rem] transition-colors duration-200";
  }
}

function showLogin() {
  if (els.appContent) els.appContent.classList.add("hidden");
  if (els.loginSection) {
    els.loginSection.classList.remove("hidden");
    els.loginSection.classList.add("auth-card-enter");
    resetAuthForm();
  }
}

function showApp() {
  if (els.loginSection) {
    els.loginSection.classList.remove("auth-card-enter");
    els.loginSection.classList.add("hidden");
  }
  if (els.appContent) els.appContent.classList.remove("hidden");
}

let unsubRealtime = () => {};
let appInitialized = false;
let authMode = "signin"; // "signin" | "signup"

function setAuthMode(nextMode) {
  authMode = nextMode;
  if (els.authSubtitle) {
    els.authSubtitle.textContent =
      authMode === "signup" ? "Create a new account." : "Sign in to your account.";
  }
  if (els.loginSubmitBtn) {
    els.loginSubmitBtn.textContent = authMode === "signup" ? "Create account" : "Sign in";
  }
  if (els.authModeToggleBtn) {
    els.authModeToggleBtn.textContent =
      authMode === "signup" ? "Already have an account? Sign in" : "Create an account";
  }
  if (els.loginPassword) {
    els.loginPassword.autocomplete = authMode === "signup" ? "new-password" : "current-password";
    els.loginPassword.value = "";
  }
  if (els.loginMsg) {
    els.loginMsg.textContent = "";
    els.loginMsg.className = "auth-field-enter text-sm mb-3 min-h-[1.25rem] transition-colors duration-200";
  }
}

async function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  els.date.value = Utils.todayISO();
  updateTodayChip();
  await setWeekToThisWeek();
  const rate = await Storage.loadHourlyRate();
  els.hourlyRate.value = String(rate ?? "");
  unsubRealtime();
  const userId = await Auth.getUserId();
  if (userId) {
    unsubRealtime = Storage.subscribeToShifts(userId, () => render());
  }
  await render();
  updatePreview();
}

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

els.addBtn.addEventListener("click", () => upsertShift());

els.cancelEditBtn.addEventListener("click", () => {
  resetEditMode();
  setMessage("Edit cancelled.");
});

els.clearBtn.addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Are you sure you want to clear all saved shift data? This action cannot be undone."
  );
  if (!confirmed) return;
  await Storage.clearAllEntries();
  resetEditMode();
  await render();
  setMessage("All saved shift data cleared.");
  updatePreview();
});

els.exportPdfBtn.addEventListener("click", () => handleExportPDF());

if (els.deleteSelectedBtn) {
  els.deleteSelectedBtn.addEventListener("click", async () => {
    const checked = els.rows.querySelectorAll(".rowCheckbox:checked[data-id]");
    if (checked.length === 0) return;
    const idsToDelete = Array.from(checked).map((cb) => cb.getAttribute("data-id"));
    const confirmed = window.confirm(
      `Delete ${idsToDelete.length} selected shift(s)? This cannot be undone.`
    );
    if (!confirmed) return;
    const entries = (await Storage.loadEntries()).filter((e) => !idsToDelete.includes(e.id));
    await Storage.saveEntries(entries, setMessage);
    if (idsToDelete.includes(editingId)) {
      editingId = null;
      Forms.resetEditMode(els, updatePreview, Utils.todayISO);
    }
    await render();
    setMessage(idsToDelete.length === 1 ? "Shift deleted." : `${idsToDelete.length} shifts deleted.`);
  });
}

els.hourlyRate.addEventListener("input", async () => {
  const rate = Number(els.hourlyRate.value || 0);
  await Storage.saveHourlyRate(rate);
  await render();
});

els.weekStart.addEventListener("change", async () => {
  await render();
});

els.weekThisBtn.addEventListener("click", () => setWeekToThisWeek());
els.weekPrevBtn.addEventListener("click", () => shiftWeekBy(-7));
els.weekNextBtn.addEventListener("click", () => shiftWeekBy(7));

els.themeToggle.addEventListener("click", () => Theme.toggleTheme(els));

if (els.authModeToggleBtn) {
  els.authModeToggleBtn.addEventListener("click", () => {
    setAuthMode(authMode === "signup" ? "signin" : "signup");
  });
}

if (els.loginSubmitBtn && els.loginEmail && els.loginPassword && els.loginMsg) {
  els.loginSubmitBtn.addEventListener("click", async () => {
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;

    if (!email) {
      els.loginMsg.textContent = "Enter your email.";
      els.loginMsg.className = "text-sm mb-3 min-h-[1.25rem] text-red-600 dark:text-red-400";
      return;
    }
    if (!password || password.length < 6) {
      els.loginMsg.textContent = "Enter a password (at least 6 characters).";
      els.loginMsg.className = "text-sm mb-3 min-h-[1.25rem] text-red-600 dark:text-red-400";
      return;
    }

    els.loginMsg.textContent = authMode === "signup" ? "Creating account…" : "Signing in…";
    els.loginMsg.className = "text-sm mb-3 min-h-[1.25rem] text-slate-600 dark:text-slate-400";
    els.loginSubmitBtn.disabled = true;

    const { error } =
      authMode === "signup"
        ? await Auth.signUpWithPassword(email, password)
        : await Auth.signInWithPassword(email, password);

    if (error) {
      const msg = error.message || "";
      const isInvalidCreds = /invalid login credentials|invalid_credentials/i.test(msg);
      els.loginMsg.textContent = isInvalidCreds
        ? "Invalid login credentials. If you just signed up, confirm your email from the link we sent."
        : msg || "Failed. Please try again.";
      els.loginMsg.className = "auth-field-enter text-sm mb-3 min-h-[1.25rem] transition-colors duration-200 text-red-600 dark:text-red-400";
      els.loginSubmitBtn.disabled = false;
      return;
    }

    if (authMode === "signup") {
      setAuthMode("signin");
      if (els.loginPassword) els.loginPassword.value = "";
      els.loginMsg.textContent = "Account created. Check your email to confirm, then sign in.";
      els.loginMsg.className = "auth-field-enter text-sm mb-3 min-h-[1.25rem] transition-colors duration-200 text-green-600 dark:text-green-400";
      els.loginSubmitBtn.disabled = false;
      return;
    }

    // Sign-in success: auth state listener will show the app
    els.loginMsg.textContent = "";
    els.loginSubmitBtn.disabled = false;
  });
}

if (els.signOutBtn) {
  els.signOutBtn.addEventListener("click", async () => {
    appInitialized = false;
    unsubRealtime();
    await Auth.signOut();
    showLogin();
  });
}

// Load theme once
Theme.applyTheme(els, Theme.loadTheme());

// Bootstrap: session check then show login or app
(async () => {
  const session = await Auth.getSession();
  if (session) {
    showApp();
    await initApp();
  } else {
    setAuthMode("signin");
    showLogin();
  }
})();

Auth.onAuthStateChange((session) => {
  if (session) {
    showApp();
    initApp();
  } else {
    setAuthMode("signin");
    showLogin();
  }
});
