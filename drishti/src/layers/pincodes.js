// Pincode areas, one state at a time (all of India has about 19,000).
// Coloured by how many public outlets (Kendras plus OSM pharmacies) each has.
import { loadJSON } from '../data.js';
import { classBreaks, classOf, drawLegend } from './districts.js';
import { mapColors, onThemeChange } from '../theme.js';

const EMPTY = { type: 'FeatureCollection', features: [] };

export function pincodeLayer(map, ui) {
  let slug = null;
  let shown = false;
  let loaded = null;
  const byPin = new Map();
  let c = mapColors();

  map.addSource('pincodes', { type: 'geojson', data: EMPTY, promoteId: 'pincode' });
  // More outlets is better (green). Pincodes with no outlet on record are grey:
  // OpenStreetMap misses many shops, so 'none mapped' is not the same as 'none'.
  const fill = () => { const r = [...c.scale].reverse(); return ['match', ['coalesce', ['feature-state', 'cls'], -1], 0, r[1], 1, r[2], 2, r[3], 3, r[4], 4, r[4], c.noData]; };
  map.addLayer({ id: 'pincodes-fill', type: 'fill', source: 'pincodes', layout: { visibility: 'none' }, paint: { 'fill-color': fill(), 'fill-opacity': 0.85 } }, 'districts-line');
  map.addLayer({ id: 'pincodes-line', type: 'line', source: 'pincodes', layout: { visibility: 'none' }, paint: { 'line-color': c.districtLine, 'line-width': 0.6 } }, 'districts-line');
  onThemeChange(() => {
    c = mapColors();
    map.setPaintProperty('pincodes-fill', 'fill-color', fill());
    map.setPaintProperty('pincodes-line', 'line-color', c.districtLine);
  });

  async function load() {
    if (!slug || loaded === slug) return;
    const fc = await loadJSON(`states/${slug}/pincodes.geojson`);
    byPin.clear();
    fc.features.forEach((f) => byPin.set(f.properties.pincode, f.properties));
    map.getSource('pincodes').setData(fc);
    const value = (p) => p.jak + p.osm_pharmacy;
    const breaks = classBreaks(fc.features.map((f) => value(f.properties)).filter((v) => v > 0));
    for (const p of byPin.values()) {
      const v = value(p);
      map.setFeatureState({ source: 'pincodes', id: p.pincode }, { cls: v > 0 ? Math.min(classOf(v, breaks), 3) : -1 });
    }
    loaded = slug;
    lastValues = fc.features.map((f) => value(f.properties));
    lastBreaks = breaks;
  }

  // When pincodes are on screen, the legend explains their colours.
  let lastValues = [];
  let lastBreaks = [];
  function legend() {
    const r = [...c.scale].reverse().slice(1);
    drawLegend(ui.legend, {
      label: 'Public outlets per pincode', worse: 'low', fmt: (v) => String(Math.round(v)),
      goodLabel: 'More outlets', badLabel: 'Fewer outlets',
      source: 'Kendras plus OpenStreetMap pharmacies. Grey: none on record',
    }, lastValues.filter((v) => v > 0), lastBreaks.slice(0, 3), r);
  }

  return {
    byPin,
    async setVisible(on) {
      shown = on;
      if (on) {
        await load();
        legend();
      }
      for (const id of ['pincodes-fill', 'pincodes-line']) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    },
    async setState(newSlug) {
      if (newSlug === slug) return;
      slug = newSlug;
      if (!slug) {
        map.getSource('pincodes').setData(EMPTY);
        loaded = null;
      }
      if (shown) await this.setVisible(!!slug);
    },
  };
}
