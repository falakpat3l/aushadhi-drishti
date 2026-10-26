// The map: a flat map of India drawn with MapLibre GL (free, open source).
// No street-map tiles and no API keys: everything on it comes from the
// boundary and data files in public/. Pinch, scroll, trackpad and
// double-tap zoom all work; rotation and tilt are off so north stays up.
// The 'CSP' build of MapLibre with its worker as a separate file: this is the
// build that survives Vite's minifier (the default one breaks in version 5).
import maplibregl from 'maplibre-gl/dist/maplibre-gl-csp.js';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker.js?url';

maplibregl.setWorkerUrl(workerUrl);
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapColors } from './theme.js';
import { addCredit } from './credits.js';

export const INDIA_BOUNDS = [[68.0, 6.5], [97.5, 37.2]];

export function createMap(container, arriving = null) {
  const c = mapColors();
  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      projection: { type: 'globe' }, // a round globe when zoomed out, flat when zoomed in
      glyphs: `${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`,
      sources: {},
      layers: [{ id: 'sea', type: 'background', paint: { 'background-color': c.sea } }],
    },
    // Arriving from another country: start where the flight left off, zoomed out.
    ...(arriving ? { center: arriving.center, zoom: arriving.zoom || 2.2 } : { bounds: INDIA_BOUNDS, fitBoundsOptions: { padding: framePadding() } }),
    minZoom: 1,
    maxZoom: 14,
    pitchWithRotate: false,
    touchPitch: false,
    attributionControl: false,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 3), // sharp on phones and Retina screens
    fadeDuration: 150,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }), 'bottom-right');

  addCredit('engine', 'Map engine <a href="https://maplibre.org" target="_blank" rel="noopener">MapLibre</a>');
  addCredit('gev', 'Idea from <a href="https://github.com/bilawalsidhu/gods-eye-view" target="_blank" rel="noopener">God\'s Eye View</a> by Bilawal Sidhu');
  return map;
}

// Room to leave around the map so the side panel or bottom sheet does not cover it.
export function framePadding() {
  const panel = document.getElementById('panel');
  const open = panel?.classList.contains('open');
  if (window.innerWidth <= 700) {
    return { top: 56, left: 16, right: 16, bottom: open ? Math.round(window.innerHeight * 0.42) + 16 : 40 };
  }
  return { top: 64, left: 40, bottom: 48, right: open ? (panel.offsetWidth || 380) + 56 : 40 };
}

export function fitTo(map, bounds, animate = true) {
  map.fitBounds(bounds, { padding: framePadding(), duration: animate ? 1400 : 0, maxZoom: 9, essential: true });
}

export function resetView(map, animate = true) {
  fitTo(map, INDIA_BOUNDS, animate);
}
