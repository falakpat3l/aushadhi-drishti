// States and UTs as one shape each, coloured by the same measures as districts
// (numbers added up from the districts, and a gap score among states).
import { loadJSON } from '../data.js';
import { metricById, aboutMetric } from '../metrics.js';
import { mapColors, onThemeChange } from '../theme.js';
import { classBreaks, classOf, fillColor, drawLegend } from './districts.js';

export async function addStates(map, ui) {
  const fc = await loadJSON('states.geojson');
  const bySlug = new Map(fc.features.map((f) => [f.properties.slug, f.properties]));
  const ids = new Map(fc.features.map((f, i) => [f.properties.slug, i + 1]));
  map.addSource('states', { type: 'geojson', data: { type: 'FeatureCollection', features: fc.features.map((f) => ({ type: 'Feature', id: ids.get(f.properties.slug), properties: { slug: f.properties.slug }, geometry: f.geometry })) } });
  let c = mapColors();
  map.addLayer({ id: 'states-fill', type: 'fill', source: 'states', layout: { visibility: 'none' }, paint: { 'fill-color': fillColor(c.scale, c), 'fill-opacity': 0.92 } }, 'districts-line');
  let current = 'gap_score';
  function paint(metricId = current) {
    current = metricId;
    const m = metricById(metricId === 'gap_score_state' ? 'gap_score' : metricId);
    const vals = [...bySlug.values()].map((p) => m.get(p));
    const breaks = classBreaks(vals);
    const pal = m.worse === 'low' ? [...c.scale].reverse() : c.scale;
    for (const [slug, p] of bySlug) map.setFeatureState({ source: 'states', id: ids.get(slug) }, { cls: classOf(m.get(p), breaks) });
    map.setPaintProperty('states-fill', 'fill-color', fillColor(pal, c));
    drawLegend(ui.legend, { ...m, source: aboutMetric(m.id).source }, vals, breaks, pal);
  }
  onThemeChange(() => {
    c = mapColors();
    if (map.getLayoutProperty('states-fill', 'visibility') === 'visible') paint();
  });
  return {
    bySlug,
    features: fc.features,
    paint,
    slugAt(id) {
      for (const [slug, i] of ids) if (i === id) return slug;
      return null;
    },
    setVisible(on) {
      map.setLayoutProperty('states-fill', 'visibility', on ? 'visible' : 'none');
    },
  };
}
