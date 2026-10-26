// District shapes, coloured by the chosen metric. Click a district for details.
import { GeoJsonDataSource, Color, ColorMaterialProperty, ConstantProperty } from 'cesium';
import { loadJSON } from '../data.js';
import { METRICS, metricById } from '../metrics.js';
import { esc } from '../ui.js';

const PALETTES = {
  seq: ['#16323d', '#1d5560', '#26807e', '#33ad97', '#5fdcb5'],
  warn: ['#2a3a2f', '#5d6b2c', '#a3862f', '#d9822f', '#ef5a4b'],
};

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

export async function addDistricts(viewer, ui, { slug, onSelect }) {
  const fc = await loadJSON(`${slug}/districts.geojson`);
  const ds = await GeoJsonDataSource.load(fc, {
    stroke: Color.fromCssColorString('#9fb3c2'),
    strokeWidth: 1,
    fill: Color.TRANSPARENT,
  });
  viewer.dataSources.add(ds);
  const byLgd = new Map(fc.features.map((f) => [f.properties.lgd, f.properties]));
  for (const e of ds.entities.values) {
    const props = byLgd.get(e.properties.lgd.getValue());
    e.ad = { kind: 'district', props };
    if (e.polygon) {
      e.polygon.outline = new ConstantProperty(true);
      e.polygon.outlineColor = new ConstantProperty(Color.fromCssColorString('#c9d6df').withAlpha(0.7));
    }
  }

  let current = 'gap_score';
  function paint(metricId) {
    current = metricId;
    const m = metricById(metricId);
    const vals = fc.features.map((f) => m.get(f.properties));
    const breaks = classBreaks(vals);
    const pal = PALETTES[m.palette || 'seq'];
    for (const e of ds.entities.values) {
      const v = m.get(e.ad.props);
      const c = classOf(v, breaks);
      const col = c < 0 ? Color.fromCssColorString('#3a4650').withAlpha(0.35) : Color.fromCssColorString(pal[c]).withAlpha(0.72);
      if (e.polygon) e.polygon.material = new ColorMaterialProperty(col);
    }
    drawLegend(ui.legend, m, vals, breaks, pal);
    viewer.scene.requestRender();
  }

  return {
    dataSource: ds,
    features: fc.features,
    paint,
    get metric() {
      return current;
    },
    setVisible(on) {
      ds.show = on;
      viewer.scene.requestRender();
    },
  };
}

function drawLegend(el, m, vals, breaks, pal) {
  const v = vals.filter((x) => x != null);
  const min = Math.min(...v);
  const max = Math.max(...v);
  el.innerHTML = `
    <div><strong>${esc(m.label)}</strong></div>
    <div class="ramp" style="background:linear-gradient(90deg,${pal.join(',')})"></div>
    <div class="ends"><span>${esc(m.fmt(min))}</span><span>${esc(m.fmt(max))}</span></div>
    ${m.note ? `<div class="note">${esc(m.note)}</div>` : ''}`;
}

export function metricOptions() {
  return METRICS.map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join('');
}
