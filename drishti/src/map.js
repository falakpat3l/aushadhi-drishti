// The map: a flat map of India drawn with MapLibre GL (free, open source).
// No street-map tiles and no API keys: everything on it comes from the
// boundary and data files in public/. Pinch, scroll, trackpad and
// double-tap zoom all work; rotation and tilt are off so north stays up.
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapColors } from './theme.js';
import { addCredit } from './credits.js';

export const INDIA_BOUNDS = [[68.0, 6.5], [97.5, 37.2]];

export function createMap(container) {
  const c = mapColors();
  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      glyphs: `${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`,
      sources: {},
      layers: [{ id: 'sea', type: 'background', paint: { 'background-color': c.sea } }],
    },
    bounds: INDIA_BOUNDS,
    fitBoundsOptions: { padding: framePadding() },
    maxBounds: [[50, -5], [115, 45]],
    minZoom: 2.8,
    maxZoom: 14,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    attributionControl: false,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 3), // sharp on phones and Retina screens
    fadeDuration: 150,
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

  addCredit('engine', 'Map engine <a href="https://maplibre.org" target="_blank" rel="noopener">MapLibre</a>');
  addCredit('gev', 'Idea from <a href="https://github.com/bilawalsidhu/gods-eye-view" target="_blank" rel="noopener">God\'s Eye View</a> by Bilawal Sidhu');
  return map;
}

// Room to leave around the map so the side panel or bottom sheet does not cover it.
export function framePadding() {
  const panel = document.getElementById('panel');
  const open = panel?.classList.contains('open');
  if (window.innerWidth <= 700) {
    return { top: 56, left: 16, right: 16, bottom: open ? Math.round(window.innerHeight * 0.5) + 16 : 40 };
  }
  return { top: 64, left: 40, bottom: 48, right: open ? (panel.offsetWidth || 380) + 56 : 40 };
}

export function fitTo(map, bounds, animate = true) {
  map.fitBounds(bounds, { padding: framePadding(), duration: animate ? 900 : 0, maxZoom: 9 });
}

export function resetView(map, animate = true) {
  fitTo(map, INDIA_BOUNDS, animate);
}
