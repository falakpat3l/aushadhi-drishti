// District shapes, coloured by the chosen measure. Tap or click a district
// for details.
import { loadJSON } from '../data.js';
import { METRICS, metricById } from '../metrics.js';
import { esc } from '../ui.js';
import { mapColors, onThemeChange } from '../theme.js';
import { BEFORE } from './basemap.js';

// Five classes by rank (quantiles), so each colour holds about the same number of districts.
export function classBreaks(values) {
  const v = values.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return [];
  return [1, 2, 3, 4].map((i) => v[Math.min(v.length - 1, Math.floor((v.length * i) / 5))]);
}

export function classOf(value, breaks) {
  if (value == null) return -1;
  let c = 0;
  while (c < breaks.length && value > breaks[c]) c += 1;
  return c;
}

function fillColor(pal, c) {
  return [
    'case',
    ['boolean', ['feature-state', 'dim'], false], c.dim,
    ['match', ['coalesce', ['feature-state', 'cls'], -1], 0, pal[0], 1, pal[1], 2, pal[2], 3, pal[3], 4, pal[4], c.noData],
  ];
}

export async function addDistricts(map, ui) {
  const fc = await loadJSON('districts.geojson');
  const byLgd = new Map(fc.features.map((f) => [f.properties.lgd, f.properties]));
  // MapLibre only needs the shape and the id; full numbers stay in byLgd.
  const slim = { type: 'FeatureCollection', features: fc.features.map((f) => ({ type: 'Feature', id: f.properties.lgd, properties: { lgd: f.properties.lgd, slug: f.properties.slug }, geometry: f.geometry })) };
  const labels = {
    type: 'FeatureCollection',
    features: fc.features.filter((f) => f.properties.label).map((f) => ({ type: 'Feature', properties: { name: f.properties.name, slug: f.properties.slug }, geometry: { type: 'Point', coordinates: f.properties.label } })),
  };
  map.addSource('districts', { type: 'geojson', data: slim });
  map.addSource('district-labels', { type: 'geojson', data: labels });

  let c = mapColors();
  let current = 'gap_score';
  let focus = null;
  let selected = null;

  map.addLayer({ id: 'districts-fill', type: 'fill', source: 'districts', paint: { 'fill-color': fillColor(c.warn, c), 'fill-opacity': 0.92 } }, BEFORE);
  map.addLayer({ id: 'districts-line', type: 'line', source: 'districts', paint: { 'line-color': c.districtLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.3, 8, 1] } }, BEFORE);
  map.addLayer({
    id: 'districts-focus', type: 'line', source: 'districts',
    paint: {
      'line-color': c.focus,
      'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, ['boolean', ['feature-state', 'hover'], false], 1.6, 0],
    },
  });
  map.addLayer({
    id: 'label-district', type: 'symbol', source: 'district-labels', minzoom: 5.8,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['NotoSans-Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 6, 11, 9, 14], 'text-max-width': 7, 'text-padding': 4 },
    paint: { 'text-color': c.label, 'text-halo-color': c.labelHalo, 'text-halo-width': 1.4 },
  });

  function paint(metricId = current) {
    current = metricId;
    const m = metricById(metricId);
    const inView = (p) => !focus || p.slug === focus;
    const vals = [...byLgd.values()].filter(inView).map((p) => m.get(p));
    const breaks = classBreaks(vals);
    const pal = c[m.palette || 'seq'];
    for (const p of byLgd.values()) {
      map.setFeatureState({ source: 'districts', id: p.lgd }, { cls: classOf(m.get(p), breaks), dim: !inView(p) });
    }
    map.setPaintProperty('districts-fill', 'fill-color', fillColor(pal, c));
    drawLegend(ui.legend, m, vals, breaks, pal);
  }

  // Hover outline (mouse only).
  let hovered = null;
  map.on('mousemove', 'districts-fill', (e) => {
    const id = e.features[0]?.id;
    if (id === hovered) return;
    if (hovered != null) map.setFeatureState({ source: 'districts', id: hovered }, { hover: false });
    hovered = id;
    map.setFeatureState({ source: 'districts', id }, { hover: true });
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'districts-fill', () => {
    if (hovered != null) map.setFeatureState({ source: 'districts', id: hovered }, { hover: false });
    hovered = null;
    map.getCanvas().style.cursor = '';
  });

  onThemeChange(() => {
    c = mapColors();
    map.setPaintProperty('districts-line', 'line-color', c.districtLine);
    map.setPaintProperty('districts-focus', 'line-color', c.focus);
    map.setPaintProperty('label-district', 'text-color', c.label);
    map.setPaintProperty('label-district', 'text-halo-color', c.labelHalo);
    paint();
  });

  return {
    byLgd,
    features: fc.features,
    paint,
    get metric() {
      return current;
    },
    setFocus(slug) {
      focus = slug;
      map.setFilter('label-district', slug ? ['==', ['get', 'slug'], slug] : null);
      paint();
    },
    select(lgd) {
      if (selected != null) map.setFeatureState({ source: 'districts', id: selected }, { selected: false });
      selected = lgd;
      if (lgd != null) map.setFeatureState({ source: 'districts', id: lgd }, { selected: true });
    },
    setVisible(on) {
      for (const id of ['districts-fill', 'districts-line']) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    },
  };
}

function drawLegend(el, m, vals, breaks, pal) {
  const v = vals.filter((x) => x != null);
  if (!v.length) {
    el.innerHTML = `<div class="legend-title">${esc(m.label)}</div><div class="note">No data for this measure here.</div>`;
    return;
  }
  const edges = [Math.min(...v), ...breaks, Math.max(...v)];
  el.innerHTML = `
    <div class="legend-title">${esc(m.label)}</div>
    <div class="ramp">${pal.map((col, i) => `<span style="background:${col}" title="${esc(m.fmt(edges[i]))} to ${esc(m.fmt(edges[i + 1]))}"></span>`).join('')}</div>
    <div class="ends"><span>${esc(m.fmt(edges[0]))}</span><span>${esc(m.fmt(edges[edges.length - 1]))}</span></div>
    ${m.note ? `<div class="note">${esc(m.note)}</div>` : ''}`;
}

export function metricOptions() {
  return METRICS.map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join('');
}
