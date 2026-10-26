// Moving between countries: the sliding tabs, clicking a country on the
// globe, and a seamless flight from one country's page to the next.
//
// How the flight stays seamless across a page load:
// 1. The old page fades its data off the globe and flies to the next country.
// 2. It saves a still picture of the plain globe and where the camera is.
// 3. The new page shows that picture at once (see index.html), starts its map
//    at the same spot, and fades the picture out once its own data is drawn.
// 4. Then it zooms in.
import { mapColors, onThemeChange } from './theme.js';

export const COUNTRIES = [
  { code: '', name: 'India', center: [82.8, 22.5] },
  { code: 'sg', name: 'Singapore', center: [103.82, 1.35] },
  { code: 'nz', name: 'New Zealand', short: 'NZ', center: [172.5, -41.3] },
  { code: 'au', name: 'Australia', center: [134.0, -27.0] },
  { code: 'eu', name: 'Europe', center: [12.0, 51.0] },
];

const FLIGHT_KEY = 'ad-flight';
const OVERVIEW_ZOOM = 2.2;
const BASE = ['sea', 'world-land']; // layers that stay while the data fades
let leaving = false;
let markTabs = () => {};

// Tabs with a highlight that slides to the picked country.
export function countryTabs(el, current, map) {
  el.innerHTML = `<div class="tabs" role="tablist" aria-label="Country">
    ${COUNTRIES.map((k) => `<button type="button" role="tab" data-code="${k.code}" aria-selected="${k.code === current}"${k.short ? ` title="${k.name}" aria-label="${k.name}"` : ''}>${k.short || k.name}</button>`).join('')}
    <span class="tabs-mark" aria-hidden="true"></span></div>`;
  const tabs = el.querySelector('.tabs');
  const mark = el.querySelector('.tabs-mark');
  const place = (btn) => {
    mark.style.width = `${btn.offsetWidth}px`;
    mark.style.transform = `translateX(${btn.offsetLeft}px)`;
  };
  const active = () => tabs.querySelector('[aria-selected=true]');
  // First placement without animation, so the highlight never slides in from the left on load.
  mark.style.transition = 'none';
  place(active());
  active().scrollIntoView({ block: 'nearest', inline: 'center' });
  requestAnimationFrame(() => requestAnimationFrame(() => (mark.style.transition = '')));
  window.addEventListener('resize', () => place(active()));
  markTabs = (code) => {
    const btn = tabs.querySelector(`[data-code="${code}"]`);
    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    place(btn);
  };
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-code]');
    if (btn && btn.dataset.code !== current) goToCountry(btn.dataset.code, map);
  });
}

// Fly to another country and open its page. `area` opens one European country.
export function goToCountry(code, map, area = null) {
  if (leaving) return;
  leaving = true;
  const to = COUNTRIES.find((k) => k.code === code) || COUNTRIES[0];
  const url = new URL(window.location.href);
  url.searchParams.delete('area');
  if (code) url.searchParams.set('country', code);
  else url.searchParams.delete('country');
  if (area) url.searchParams.set('area', area);
  const go = () => window.location.assign(url.toString());
  markTabs(code);
  document.getElementById('hop-tip')?.remove();
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!map || calm) return go();

  document.body.classList.add('leaving');
  fadeData(map);
  map.setMaxBounds(null);
  map.setMinZoom(1);
  const from = map.getCenter();
  const far = Math.min(1, distanceKm([from.lng, from.lat], to.center) / 9000);
  map.flyTo({ center: to.center, zoom: OVERVIEW_ZOOM, bearing: 0, duration: 1100 + far * 700, curve: 1.3, easing: easeInOut, essential: true });
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    saveFlight(map, to);
    go();
  };
  map.once('moveend', () => {
    map.once('render', finish); // the picture is taken right after a frame is drawn
    map.triggerRepaint();
  });
  setTimeout(finish, 3500); // in case the map never reports the end
}

// Turn every data layer transparent, leaving the plain globe.
function fadeData(map) {
  const props = { fill: ['fill-opacity'], line: ['line-opacity'], circle: ['circle-opacity', 'circle-stroke-opacity'], symbol: ['text-opacity', 'icon-opacity'] };
  for (const layer of map.getStyle().layers) {
    if (BASE.includes(layer.id)) continue;
    for (const p of props[layer.type] || []) {
      map.setPaintProperty(layer.id, `${p}-transition`, { duration: 450, delay: 0 });
      map.setPaintProperty(layer.id, p, 0);
    }
  }
}

function saveFlight(map, to) {
  const flight = { center: to.center, zoom: map.getZoom(), name: to.name, theme: document.documentElement.dataset.theme, at: Date.now() };
  try {
    flight.snap = snapshot(map);
  } catch {
    /* no picture: the new page simply starts on its own globe */
  }
  try {
    sessionStorage.setItem(FLIGHT_KEY, JSON.stringify(flight));
  } catch {
    try {
      delete flight.snap;
      sessionStorage.setItem(FLIGHT_KEY, JSON.stringify(flight));
    } catch {
      /* private mode: no flight on arrival */
    }
  }
}

// A still of the map, at no more than 1.5x screen size to keep it small.
function snapshot(map) {
  const gl = map.getCanvas();
  const scale = Math.min(window.devicePixelRatio || 1, 1.5);
  const out = document.createElement('canvas');
  out.width = Math.round(gl.clientWidth * scale);
  out.height = Math.round(gl.clientHeight * scale);
  const ctx = out.getContext('2d');
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor; // space around the globe
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(gl, 0, 0, out.width, out.height);
  return out.toDataURL('image/jpeg', 0.85);
}

// Called on load: where the flight left off (or null when there was none).
export function arrivingFlight() {
  try {
    const f = JSON.parse(sessionStorage.getItem(FLIGHT_KEY) || 'null');
    sessionStorage.removeItem(FLIGHT_KEY);
    return f && Date.now() - f.at < 15000 ? f : null;
  } catch {
    return null;
  }
}

// Once the new page's data is drawn: fade the still picture away, then zoom in.
export function arrive(map, zoomIn) {
  let done = false;
  const start = () => {
    if (done) return;
    done = true;
    const snap = document.getElementById('arrive-snap');
    document.body.classList.remove('arriving');
    if (snap) {
      snap.classList.add('gone');
      setTimeout(() => snap.remove(), 600);
    }
    setTimeout(zoomIn, snap ? 380 : 0);
  };
  map.once('idle', start);
  setTimeout(start, 4000);
}

// If the data cannot load, still take the picture away.
export function clearArrival() {
  document.body.classList.remove('arriving');
  document.getElementById('arrive-snap')?.remove();
}

// Plain land for the whole world, drawn under everything, so a flight
// between countries passes over continents, not empty sea.
export async function addWorldLand(map, beforeId) {
  const data = await (await fetch(`${import.meta.env.BASE_URL}basemap/world-land.json`)).json();
  map.addSource('world-land', { type: 'geojson', data });
  map.addLayer({ id: 'world-land', type: 'fill', source: 'world-land', paint: { 'fill-color': mapColors().neighbour } }, beforeId);
  onThemeChange(() => map.setPaintProperty('world-land', 'fill-color', mapColors().neighbour));
}

// The other countries on the globe: a marked dot and name for each, and their
// outlines, which light up on hover. Click or tap one to fly there.
export async function addCountryHops(map, current) {
  const shapes = await (await fetch(`${import.meta.env.BASE_URL}basemap/world-countries.json`)).json();
  shapes.features = shapes.features.filter((f) => f.properties.code !== current);
  const pins = COUNTRIES.filter((k) => k.code !== current).map((k) => ({ type: 'Feature', properties: { code: k.code, name: k.name }, geometry: { type: 'Point', coordinates: k.center } }));
  map.addSource('hops', { type: 'geojson', data: shapes });
  map.addSource('hop-pins', { type: 'geojson', data: { type: 'FeatureCollection', features: pins } });
  const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0f8a7a';
  const hovered = ['boolean', ['feature-state', 'hover'], false];
  map.addLayer({ id: 'hop-fill', type: 'fill', source: 'hops', paint: { 'fill-color': accent(), 'fill-opacity': ['case', hovered, 0.22, 0] } });
  map.addLayer({ id: 'hop-line', type: 'line', source: 'hops', paint: { 'line-color': accent(), 'line-width': 1.4, 'line-opacity': ['case', hovered, 1, 0] } });
  map.addLayer({ id: 'hop-halo', type: 'circle', source: 'hop-pins', maxzoom: 5.5, paint: { 'circle-color': accent(), 'circle-opacity': 0.18, 'circle-radius': 12 } });
  map.addLayer({ id: 'hop-dot', type: 'circle', source: 'hop-pins', maxzoom: 5.5, paint: { 'circle-color': accent(), 'circle-radius': 5, 'circle-stroke-color': mapColors().land, 'circle-stroke-width': 2 } });
  map.addLayer({
    id: 'hop-name', type: 'symbol', source: 'hop-pins', maxzoom: 5.5,
    layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': ['NotoSans-Medium'], 'text-size': 11, 'text-letter-spacing': 0.1, 'text-offset': [0, 1.5], 'text-anchor': 'top', 'text-allow-overlap': true },
    paint: { 'text-color': mapColors().label, 'text-halo-color': mapColors().labelHalo, 'text-halo-width': 1.6 },
  });
  onThemeChange(() => {
    const c = mapColors();
    for (const id of ['hop-fill', 'hop-halo', 'hop-dot']) map.setPaintProperty(id, id === 'hop-fill' ? 'fill-color' : 'circle-color', accent());
    map.setPaintProperty('hop-line', 'line-color', accent());
    map.setPaintProperty('hop-dot', 'circle-stroke-color', c.land);
    map.setPaintProperty('hop-name', 'text-color', c.label);
    map.setPaintProperty('hop-name', 'text-halo-color', c.labelHalo);
  });

  const tip = document.createElement('div');
  tip.id = 'hop-tip';
  tip.className = 'hop-tip';
  tip.hidden = true;
  document.querySelector('.stage').append(tip);
  let hover = null;
  const at = (point) => {
    const box = [[point.x - 8, point.y - 8], [point.x + 8, point.y + 8]];
    return map.queryRenderedFeatures(box, { layers: ['hop-dot', 'hop-name'] })[0] || map.queryRenderedFeatures(point, { layers: ['hop-fill'] })[0];
  };
  const setHover = (id) => {
    if (hover === id) return;
    if (hover != null) map.setFeatureState({ source: 'hops', id: hover }, { hover: false });
    hover = id;
    if (hover != null) map.setFeatureState({ source: 'hops', id: hover }, { hover: true });
  };
  map.on('mousemove', (e) => {
    if (leaving) return;
    const f = at(e.point);
    if (!f) {
      if (!tip.hidden) {
        tip.hidden = true;
        map.getCanvas().style.cursor = '';
      }
      return setHover(null);
    }
    // Over a dot or name too, light up that country's outline.
    const outline = f.source === 'hops' ? f : map.queryRenderedFeatures(e.point, { layers: ['hop-fill'] })[0];
    setHover(outline?.id ?? null);
    const p = f.properties;
    const name = COUNTRIES.find((k) => k.code === p.code)?.name;
    tip.textContent = p.area ? `${p.name} · open ${name} →` : `Open ${name} →`;
    tip.style.transform = `translate(${e.point.x + 14}px, ${e.point.y + 14}px)`;
    tip.hidden = false;
    map.getCanvas().style.cursor = 'pointer';
  });
  map.getCanvas().addEventListener('mouseleave', () => {
    tip.hidden = true;
    setHover(null);
  });
  map.on('click', (e) => {
    const f = at(e.point);
    if (f) goToCountry(f.properties.code, map, f.properties.area || null);
  });
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function distanceKm([lng1, lat1], [lng2, lat2]) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}
