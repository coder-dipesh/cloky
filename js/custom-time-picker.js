/**
 * Custom 12h time wheel (AM/PM). Outputs HH:mm (24h) for clock in/out.
 */

const ROW_HEIGHT = 40;

let currentInput = null;
let overlayEl, dialogEl, hourEl, minuteEl, ampmEl, setBtn, cancelBtn;
const PICKER_GAP = 8;
const VIEWPORT_PAD = 16;

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Parse "HH:mm" or "H:mm" to { hour24, minute } */
function parseTime(str) {
  const s = (str || "").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { hour24: 9, minute: 0 };
  const hour24 = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  const minute = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return { hour24, minute };
}

/** 24h -> 12h + ampm */
function to12h(hour24) {
  if (hour24 === 0) return { hour12: 12, ampm: "AM" };
  if (hour24 < 12) return { hour12: hour24, ampm: "AM" };
  if (hour24 === 12) return { hour12: 12, ampm: "PM" };
  return { hour12: hour24 - 12, ampm: "PM" };
}

function to24h(hour12, ampm) {
  if (ampm === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function getSelected() {
  const hourLen = 12;
  const minuteLen = 60;
  const ampmLen = 2;
  const rawHour = Math.round(hourEl.scrollTop / ROW_HEIGHT);
  const rawMinute = Math.round(minuteEl.scrollTop / ROW_HEIGHT);
  const rawAmpm = Math.round(ampmEl.scrollTop / ROW_HEIGHT);
  const hour12 = (rawHour % hourLen + hourLen) % hourLen + 1;
  const minute = (rawMinute % minuteLen + minuteLen) % minuteLen;
  const ampm = (rawAmpm % ampmLen + ampmLen) % ampmLen === 0 ? "AM" : "PM";
  return { hour12, minute, ampm };
}

function formatOutput({ hour12, minute, ampm }) {
  const hour24 = to24h(hour12, ampm);
  return `${pad2(hour24)}:${pad2(minute)}`;
}

function updateSelectedClass(wheelEl) {
  const items = wheelEl.querySelectorAll(".time-picker-wheel-item");
  const idx = Math.round(wheelEl.scrollTop / ROW_HEIGHT);
  items.forEach((el, i) => el.classList.toggle("selected", i === idx));
}

const REPEAT = 3;

/** Build a wheel that loops (e.g. … 59, 00, 01 … and … 12, 1, 2 …). */
function buildLoopingWheel(container, values, initialIndex) {
  const len = values.length;
  const repeated = Array(REPEAT).fill(values).flat();
  container.innerHTML = "";
  container.dataset.loopLength = String(len);
  const inner = document.createElement("div");
  inner.className = "time-picker-wheel-inner";
  repeated.forEach((val, i) => {
    const div = document.createElement("div");
    div.className = "time-picker-wheel-item";
    div.textContent = val;
    div.dataset.index = String(i % len);
    inner.appendChild(div);
  });
  container.appendChild(inner);
  const startScroll = (len + initialIndex) * ROW_HEIGHT;
  container.scrollTop = startScroll;
  updateSelectedClass(container);
}

/** Non-looping wheel (used for AM/PM when we don’t need wrap). */
function buildWheel(container, values, initialIndex) {
  container.innerHTML = "";
  delete container.dataset.loopLength;
  const inner = document.createElement("div");
  inner.className = "time-picker-wheel-inner";
  values.forEach((val, i) => {
    const div = document.createElement("div");
    div.className = "time-picker-wheel-item" + (i === initialIndex ? " selected" : "");
    div.textContent = val;
    div.dataset.index = String(i);
    inner.appendChild(div);
  });
  container.appendChild(inner);
  container.scrollTop = initialIndex * ROW_HEIGHT;
}

/** After scroll ends, recenter looping wheels so we can keep scrolling in either direction. */
let scrollEndTimer = null;
function onWheelScrollEnd(wheelEl) {
  const loopLen = wheelEl.dataset.loopLength;
  if (!loopLen) return;
  const len = parseInt(loopLen, 10);
  const idx = Math.round(wheelEl.scrollTop / ROW_HEIGHT);
  if (idx >= len && idx < 2 * len) return;
  const logical = ((idx % len) + len) % len;
  wheelEl.scrollTop = (len + logical) * ROW_HEIGHT;
  updateSelectedClass(wheelEl);
}

function scheduleScrollEnd(wheelEl) {
  if (scrollEndTimer) clearTimeout(scrollEndTimer);
  scrollEndTimer = setTimeout(() => {
    scrollEndTimer = null;
    onWheelScrollEnd(hourEl);
    onWheelScrollEnd(minuteEl);
  }, 120);
}

function open(inputEl) {
  currentInput = inputEl;
  const { hour24, minute } = parseTime(inputEl.value);
  const { hour12, ampm } = to12h(hour24);
  const hourIndex = hour12 - 1;
  const minuteIndex = minute;
  const ampmIndex = ampm === "AM" ? 0 : 1;

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = Array.from({ length: 60 }, (_, i) => pad2(i));
  const ampmVals = ["AM", "PM"];

  buildLoopingWheel(hourEl, hours, hourIndex);
  buildLoopingWheel(minuteEl, minutes, minuteIndex);
  buildWheel(ampmEl, ampmVals, ampmIndex);

  if (dialogEl) dialogEl.style.visibility = "hidden";
  overlayEl.classList.remove("hidden");
  overlayEl.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    positionDialogUnder(inputEl);
    dialogEl.focus();
  });
}

function positionDialogUnder(inputEl) {
  if (!dialogEl || !inputEl) return;
  const rect = inputEl.getBoundingClientRect();
  const dw = dialogEl.offsetWidth;
  const dh = dialogEl.offsetHeight;
  let top = rect.bottom + PICKER_GAP;
  let left = rect.left + (rect.width / 2) - (dw / 2);
  if (top + dh > window.innerHeight - VIEWPORT_PAD) {
    top = Math.max(VIEWPORT_PAD, window.innerHeight - dh - VIEWPORT_PAD);
  }
  if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
  if (left + dw > window.innerWidth - VIEWPORT_PAD) {
    left = window.innerWidth - dw - VIEWPORT_PAD;
  }
  dialogEl.style.position = "fixed";
  dialogEl.style.top = `${top}px`;
  dialogEl.style.left = `${left}px`;
  dialogEl.style.visibility = "";
}

function close() {
  const trigger = currentInput;
  currentInput = null;
  if (trigger && typeof trigger.focus === "function") {
    trigger.focus();
  }
  overlayEl.classList.add("hidden");
  overlayEl.setAttribute("aria-hidden", "true");
}

function onSet() {
  const trigger = currentInput;
  if (trigger) {
    trigger.value = formatOutput(getSelected());
    trigger.dispatchEvent(new Event("change", { bubbles: true }));
  }
  close();
}

function initElements() {
  overlayEl = document.getElementById("customTimePickerOverlay");
  dialogEl = document.getElementById("customTimePickerDialog");
  hourEl = document.getElementById("timePickerHour");
  minuteEl = document.getElementById("timePickerMinute");
  ampmEl = document.getElementById("timePickerAmPm");
  setBtn = document.getElementById("customTimePickerSet");
  cancelBtn = document.getElementById("customTimePickerCancel");
  if (!overlayEl || !dialogEl || !hourEl || !minuteEl || !ampmEl || !setBtn || !cancelBtn) return false;

  [hourEl, minuteEl, ampmEl].forEach((el) => {
    el.addEventListener("scroll", () => {
      updateSelectedClass(el);
      scheduleScrollEnd(el);
    });
  });
  setBtn.addEventListener("click", onSet);
  cancelBtn.addEventListener("click", close);
  overlayEl.addEventListener("click", (e) => {
    if (e.target === overlayEl) close();
  });
  return true;
}

/**
 * Attach custom time picker to clockIn and clockOut. On focus/click, show picker instead of keyboard.
 */
export function initCustomTimePickers(els) {
  if (!initElements()) return;
  if (!els || !els.clockIn || !els.clockOut) return;

  function openPicker(e, input) {
    e.preventDefault();
    input.blur();
    open(input);
  }

  els.clockIn.addEventListener("focus", (e) => openPicker(e, els.clockIn));
  els.clockIn.addEventListener("click", (e) => openPicker(e, els.clockIn));
  els.clockOut.addEventListener("focus", (e) => openPicker(e, els.clockOut));
  els.clockOut.addEventListener("click", (e) => openPicker(e, els.clockOut));
}
