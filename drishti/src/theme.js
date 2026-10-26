// Light and dark mode. The choice is remembered on this device; the first
// visit follows the phone or computer setting.
const KEY = 'ad-theme';
const listeners = new Set();

// Map colours for each mode. Page colours live in style.css.
export const MAP_COLORS = {
  light: {
    sea: '#dde5ea',
    neighbour: '#ececea',
    neighbourLine: '#cfd2d4',
    land: '#ffffff',
    districtLine: 'rgba(0,0,0,0.16)',
    stateLine: 'rgba(0,0,0,0.55)',
    border: '#111111',
    dim: '#f0f0ee',
    noData: '#d9d9d9',
    focus: '#0000ee',
    label: '#1a1a1a',
    labelHalo: 'rgba(255,255,255,0.92)',
    labelMuted: '#6b6f73',
    // good to bad: green, yellow-green, sand, orange, red
    scale: ['#1f9e89', '#8fcf9f', '#f3e3a6', '#f2a167', '#d4553d'],
  },
  dark: {
    sea: '#0b1014',
    neighbour: '#1c2023',
    neighbourLine: '#2c3236',
    land: '#1b2124',
    districtLine: 'rgba(255,255,255,0.14)',
    stateLine: 'rgba(230,230,230,0.55)',
    border: '#e6e6e6',
    dim: '#1f2528',
    noData: '#3a3f42',
    focus: '#69cbd1',
    label: '#e6e6e6',
    labelHalo: 'rgba(14,19,22,0.9)',
    labelMuted: '#8b959b',
    scale: ['#2aa190', '#7dbb8f', '#cdbf7e', '#e0905a', '#e45b44'],
  },
};

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function mapColors() {
  return MAP_COLORS[currentTheme()];
}

export function onThemeChange(fn) {
  listeners.add(fn);
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#141414' : '#ffffff');
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☼' : '☾';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  listeners.forEach((fn) => fn(theme));
}

export function setupTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    /* private mode: just follow the system */
  }
  const system = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  apply(saved || system);
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    apply(next);
  });
}
