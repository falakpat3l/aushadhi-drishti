// Light and dark mode. The choice is remembered on this device; the first
// visit follows the phone or computer setting.
const KEY = 'ad-theme';
const listeners = new Set();

// Map colours for each mode. Page colours live in style.css.
export const MAP_COLORS = {
  light: {
    sea: '#e8edf0',
    neighbour: '#f3f3f1',
    neighbourLine: '#c9cdd0',
    land: '#ffffff',
    districtLine: 'rgba(0,0,0,0.16)',
    stateLine: 'rgba(0,0,0,0.55)',
    border: '#111111',
    dim: '#f0f0ee',
    noData: '#dedede',
    focus: '#0000ee',
    label: '#1a1a1a',
    labelHalo: 'rgba(255,255,255,0.92)',
    labelMuted: '#6b6f73',
    warn: ['#f6f1e4', '#f0d39c', '#e7a364', '#d4663f', '#a8262a'],
    seq: ['#eef3f6', '#c3d8e4', '#8db6cd', '#4d8db1', '#1d5c8a'],
  },
  dark: {
    sea: '#0e1316',
    neighbour: '#181d20',
    neighbourLine: '#2c3438',
    land: '#1b2124',
    districtLine: 'rgba(255,255,255,0.14)',
    stateLine: 'rgba(230,230,230,0.55)',
    border: '#e6e6e6',
    dim: '#1f2528',
    noData: '#2c3134',
    focus: '#69cbd1',
    label: '#e6e6e6',
    labelHalo: 'rgba(14,19,22,0.9)',
    labelMuted: '#8b959b',
    warn: ['#2a2b25', '#57492b', '#8c5c2c', '#c2612f', '#ef5a44'],
    seq: ['#1a252b', '#1d4252', '#25697c', '#3693a3', '#69cbd1'],
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
