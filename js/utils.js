/**
 * Utility Functions - Date, Time, and Formatting
 */

export function pad2(n) { 
  return String(n).padStart(2, "0"); 
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Parse "YYYY-MM-DD" safely into local Date (no timezone surprises)
export function parseISODateLocal(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function formatTime12Hour(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const hours = h % 12 || 12;
  const minutes = String(m).padStart(2, "0");
  const ampm = h < 12 ? "AM" : "PM";
  return `${hours}:${minutes} ${ampm}`;
}

export function fmtHours(h) {
  return (Math.round(h * 100) / 100).toFixed(2);
}

export function fmtMoney(x) {
  return `$${Number(x).toFixed(2)}`;
}

export function getDayName(dateISO) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = parseISODateLocal(dateISO);
  return dayNames[d.getDay()];
}

export function isoFromDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

// Week starts Monday. Return Date object for Monday of the given Date (local).
export function mondayOf(dateObj) {
  const d = new Date(dateObj);
  d.setHours(0,0,0,0);
  const day = d.getDay(); // 0 Sun, 1 Mon...
  const diff = (day === 0 ? -6 : 1 - day); // if Sunday go back 6 days
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWeekRange(weekStartISO) {
  const start = parseISODateLocal(weekStartISO);
  const end = new Date(start);
  end.setDate(start.getDate() + 7); // exclusive
  return { start, end };
}

export function shiftFallsInWeek(entryDateISO, weekStartISO) {
  const { start, end } = getWeekRange(weekStartISO);
  const d = parseISODateLocal(entryDateISO);
  return d >= start && d < end;
}

// Fortnight (14-day pay cycle) utilities
export function getFortnightRange(fortnightStartISO) {
  const start = parseISODateLocal(fortnightStartISO);
  const end = new Date(start);
  end.setDate(start.getDate() + 14); // exclusive
  return { start, end };
}

export function shiftFallsInFortnight(entryDateISO, fortnightStartISO) {
  const { start, end } = getFortnightRange(fortnightStartISO);
  const d = parseISODateLocal(entryDateISO);
  return d >= start && d < end;
}

// Get the start of the fortnight that contains the given date
// Fortnights are 14-day periods, typically starting on 1st and 15th of each month
export function fortnightStartOf(dateObj) {
  const d = new Date(dateObj);
  d.setHours(0, 0, 0, 0);
  const day = d.getDate();
  
  // If day is 1-14, fortnight starts on the 1st
  // If day is 15-31, fortnight starts on the 15th
  if (day <= 14) {
    d.setDate(1);
  } else {
    d.setDate(15);
  }
  
  return d;
}

// Format date range for display (e.g., "Jan 1 - Jan 14, 2026")
export function formatFortnightRange(fortnightStartISO) {
  const { start, end } = getFortnightRange(fortnightStartISO);
  const endDate = new Date(end);
  endDate.setDate(endDate.getDate() - 1); // Last day of fortnight (inclusive)
  
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const endStr = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  
  return `${startStr} - ${endStr}`;
}
