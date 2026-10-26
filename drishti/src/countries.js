// The country switch: a sliding row of tabs (India, Singapore, New Zealand,
// Australia, Europe) and the short flight between countries.
import { mapColors, onThemeChange } from './theme.js';

export const COUNTRIES = [
  { code: '', name: 'India', center: [82.8, 22.5] },
  { code: 'sg', name: 'Singapore', center: [103.82, 1.35] },
  { code: 'nz', name: 'New Zealand', center: [172.5, -41.3] },
  { code: 'au', name: 'Australia', center: [134.0, -27.0] },
  { code: 'eu', name: 'Europe', center: [12.0, 51.0] },
];

const FLIGHT_KEY = 'ad-flight';

// Tabs with a highlight that slides to the picked country.
export function countryTabs(el, current, map) {
  el.innerHTML = `<div class="tabs" role="tablist" aria-label="Country">
    ${COUNTRIES.map((k) => `<button type="button" role="tab" data-code="${k.code}" aria-selected="${k.code === current}">${k.name}</button>`).join('')}
    <span class="tabs-mark" aria-hidden="true"></span></div>`;
  const tabs = el.querySelector('.tabs');
  const mark = el.querySelector('.tabs-mark');
  const place = (btn) => {
    mark.style.width = `${btn.offsetWidth}px`;
    mark.style.transform = `translateX(${btn.offsetLeft}px)`;
  };
  const active = () => tabs.querySelector('[aria-selected=true]');
  requestAnimationFrame(() => {
    place(active());
    active().scrollIntoView({ block: 'nearest', inline: 'center' });
  });
  window.addEventListener('resize', () => place(active()));
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-code]');
    if (!btn || btn.dataset.code === current) return;
    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    place(btn);
    goToCountry(btn.dataset.code, map);
  });
}

// A short flight: zoom out, glide over the world to the next country, then
// load its page. The next page finishes the flight by zooming in.
export function goToCountry(code, map) {
  const to = COUNTRIES.find((k) => k.code === code) || COUNTRIES[0];
  const url = new URL(window.location.href);
  if (code) url.searchParams.set('country', code);
  else url.searchParams.delete('country');
  const go = () => (window.location.href = url.toString());
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!map || calm) return go();
  try {
    sessionStorage.setItem(FLIGHT_KEY, JSON.stringify({ center: to.center, at: Date.now() }));
  } catch {
    /* private mode: no flight on arrival */
  }
  document.body.classList.add('leaving');
  map.setMaxBounds(null);
  map.setMinZoom(1);
  map.flyTo({ center: to.center, zoom: 2.4, duration: 1100, curve: 1.6, essential: true });
  map.once('moveend', go);
  setTimeout(go, 1500); // in case the map never reports the end
}

// Called on load: where the flight left off (or null when there was none).
export function arrivingFlight() {
  try {
    const f = JSON.parse(sessionStorage.getItem(FLIGHT_KEY) || 'null');
    sessionStorage.removeItem(FLIGHT_KEY);
    return f && Date.now() - f.at < 10000 ? f : null;
  } catch {
    return null;
  }
}

// Plain land for the whole world, drawn under everything, so a flight
// between countries passes over continents, not empty sea.
export async function addWorldLand(map, beforeId) {
  const data = await (await fetch(`${import.meta.env.BASE_URL}basemap/world-land.json`)).json();
  map.addSource('world-land', { type: 'geojson', data });
  map.addLayer({ id: 'world-land', type: 'fill', source: 'world-land', paint: { 'fill-color': mapColors().neighbour } }, beforeId);
  onThemeChange(() => map.setPaintProperty('world-land', 'fill-color', mapColors().neighbour));
}
