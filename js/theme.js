/**
 * Theme Management
 */

import { THEME_KEY } from './config.js';

export function applyTheme(els, theme) {
  const root = document.documentElement;
  const isDark = theme === "dark";
  root.classList.toggle("dark", isDark);
  if (els.themeToggleLabel) {
    els.themeToggleLabel.textContent = isDark ? "Light mode" : "Dark mode";
  }
  if (els.themeIconSun && els.themeIconMoon) {
    els.themeIconSun.classList.toggle("hidden", isDark);
    els.themeIconMoon.classList.toggle("hidden", !isDark);
  }
}

export function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;

  // fallback to system preference
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function toggleTheme(els) {
  const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(els, next);
}
