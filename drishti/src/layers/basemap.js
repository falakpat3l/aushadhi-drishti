// The background map, drawn from official boundary data so that India looks
// the way the Government of India shows it (all of Jammu and Kashmir, Ladakh
// and Arunachal Pradesh inside India). Built by pipeline/basemap.py.
import { mapColors, onThemeChange } from '../theme.js';
import { addCredit } from '../credits.js';

const FONT = ['NotoSans-Regular'];
const FONT_BOLD = ['NotoSans-Medium'];
const FONT_ITALIC = ['NotoSans-Italic'];

// Layer ids, bottom to top. Data layers are slotted in before BEFORE.
export const BEFORE = 'state-lines';

export async function addBasemap(map) {
  const res = await fetch(`${import.meta.env.BASE_URL}basemap/india-basemap.json`);
  const data = await res.json();
  const c = mapColors();
  const labels = (kind) => ({
    type: 'FeatureCollection',
    features: data.labels
      .filter((l) => l[3] === kind && (kind !== 'country' || (l[0] > 58 && l[0] < 102 && l[1] > 0 && l[1] < 42)))
      .map(([lon, lat, name, , size]) => ({ type: 'Feature', properties: { name, size }, geometry: { type: 'Point', coordinates: [lon, lat] } })),
  });

  map.addSource('neighbours', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: data.neighbours.map((n) => ({ type: 'Feature', properties: { name: n.name }, geometry: n.geometry })) },
  });
  map.addSource('india', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: data.india } });
  map.addSource('state-lines', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: data.state_lines } });
  for (const kind of ['state', 'country', 'city', 'sea']) map.addSource(`labels-${kind}`, { type: 'geojson', data: labels(kind) });

  map.addLayer({ id: 'neighbours-fill', type: 'fill', source: 'neighbours', paint: { 'fill-color': c.neighbour } });
  map.addLayer({ id: 'neighbours-line', type: 'line', source: 'neighbours', paint: { 'line-color': c.neighbourLine, 'line-width': 0.8 } });
  // India's land is drawn by the district colours; this only shows if districts are switched off.
  map.addLayer({ id: 'india-land', type: 'fill', source: 'india', paint: { 'fill-color': c.land, 'fill-opacity': 0 } });
  map.addLayer({ id: 'state-lines', type: 'line', source: 'state-lines', paint: { 'line-color': c.stateLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.7, 8, 1.6] } });
  map.addLayer({ id: 'india-border', type: 'line', source: 'india', paint: { 'line-color': c.border, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.2, 8, 2.4] } });

  const text = (extra) => ({ 'text-color': c.label, 'text-halo-color': c.labelHalo, 'text-halo-width': 1.4, ...extra });
  map.addLayer({
    id: 'label-sea', type: 'symbol', source: 'labels-sea', maxzoom: 7,
    layout: { 'text-field': ['get', 'name'], 'text-font': FONT_ITALIC, 'text-size': 13, 'text-letter-spacing': 0.08 },
    paint: text({ 'text-color': c.labelMuted }),
  });
  map.addLayer({
    id: 'label-country', type: 'symbol', source: 'labels-country', maxzoom: 7,
    layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': FONT, 'text-size': 11, 'text-letter-spacing': 0.15 },
    paint: text({ 'text-color': c.labelMuted }),
  });
  map.addLayer({
    id: 'label-state', type: 'symbol', source: 'labels-state', maxzoom: 6.4,
    filter: ['>', ['get', 'size'], 0.05],
    layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': FONT_BOLD, 'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 6, 13], 'text-letter-spacing': 0.12, 'text-max-width': 8 },
    paint: text({}),
  });
  map.addLayer({
    id: 'label-city', type: 'symbol', source: 'labels-city', minzoom: 5,
    filter: ['<=', ['get', 'size'], ['step', ['zoom'], 2, 6, 5, 7, 9]],
    layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 12, 'text-offset': [0, 0.6], 'text-anchor': 'top' },
    paint: text({ 'text-color': c.labelMuted }),
  });

  onThemeChange(() => {
    const k = mapColors();
    map.setPaintProperty('sea', 'background-color', k.sea);
    map.setPaintProperty('neighbours-fill', 'fill-color', k.neighbour);
    map.setPaintProperty('neighbours-line', 'line-color', k.neighbourLine);
    map.setPaintProperty('india-land', 'fill-color', k.land);
    map.setPaintProperty('state-lines', 'line-color', k.stateLine);
    map.setPaintProperty('india-border', 'line-color', k.border);
    for (const id of ['label-sea', 'label-country', 'label-state', 'label-city']) {
      map.setPaintProperty(id, 'text-color', id === 'label-state' ? k.label : k.labelMuted);
      map.setPaintProperty(id, 'text-halo-color', k.labelHalo);
    }
  });

  addCredit('basemap', 'Map of India: Survey of India outline (CC BY 4.0, via DataMeet); neighbours and cities: Natural Earth; label font: Noto Sans (OFL)');
}
