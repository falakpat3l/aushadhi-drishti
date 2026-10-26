// Pincode areas, one state at a time (all of India has about 19,000).
// Coloured by how many public outlets (Kendras plus OSM pharmacies) each has.
import { loadJSON } from '../data.js';
import { classBreaks, classOf } from './districts.js';
import { mapColors, onThemeChange } from '../theme.js';

const EMPTY = { type: 'FeatureCollection', features: [] };

export function pincodeLayer(map) {
  let slug = null;
  let shown = false;
  let loaded = null;
  const byPin = new Map();
  let c = mapColors();

  map.addSource('pincodes', { type: 'geojson', data: EMPTY, promoteId: 'pincode' });
  const fill = () => ['match', ['coalesce', ['feature-state', 'cls'], -1], 0, c.seq[0], 1, c.seq[1], 2, c.seq[2], 3, c.seq[3], 4, c.seq[4], 'rgba(0,0,0,0)'];
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
      map.setFeatureState({ source: 'pincodes', id: p.pincode }, { cls: v > 0 ? classOf(v, breaks) : -1 });
    }
    loaded = slug;
  }

  return {
    byPin,
    async setVisible(on) {
      shown = on;
      if (on) await load();
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
