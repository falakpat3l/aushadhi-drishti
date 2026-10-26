// Countries outside India (Singapore, New Zealand). A lighter view than
// India's: regions coloured by one measure, pharmacy dots, a ranking and a
// details table. Data comes from pipeline/world.py (public/data/world/<code>/).
import { loadJSON } from './data.js';
import { mapColors, onThemeChange } from './theme.js';
import { classBreaks, classOf, fillColor, drawLegend } from './layers/districts.js';
import { fitTo } from './map.js';
import { esc } from './ui.js';
import { addCredit } from './credits.js';
import { countryTabs, goToCountry, addWorldLand } from './countries.js';


const n0 = (v) => (v == null ? 'n/a' : Math.round(v).toLocaleString('en-GB'));
const MEASURES = [
  { id: 'access_score', label: 'Access score', title: 'Where would one more pharmacy help most?', sub: '0 = well served, 100 = most underserved', worse: 'high', fmt: n0 },
  { id: 'people_per_pharmacy', label: 'People per pharmacy', title: 'How many people share one pharmacy?', sub: 'Residents for every pharmacy on record', worse: 'high', fmt: n0 },
  { id: 'per_10k', label: 'Pharmacies per 10,000 people', title: 'Pharmacies for every 10,000 people', sub: 'Pharmacies on record', worse: 'low', fmt: (v) => (v == null ? 'n/a' : v.toFixed(2)) },
  { id: 'share_65', label: 'People aged 65 and over', title: 'How old is the population?', sub: 'Share of residents aged 65 and over', worse: 'high', fmt: (v) => (v == null ? 'n/a' : `${v}%`), goodLabel: 'Younger', badLabel: 'Older' },
  { id: 'people', label: 'Population', title: 'How many people live here?', sub: 'Residents', worse: 'high', fmt: n0, goodLabel: 'Fewer people', badLabel: 'More people' },
];

// Coming soon, per country: what is not on the map yet and why.
const SOON = {
  sg: [['Clinic and hospital pharmacies', 'the open list covers retail pharmacies only'], ['GP clinics and polyclinics', 'to be added from the MOH directory']],
  au: [['Smaller areas (SA4 regions)', 'state level for now; ABS regions to be added'], ['Official pharmacy counts', 'PBS-approved pharmacy numbers by state to be added']],
  eu: [['Pharmacists by region', 'Eurostat publishes pharmacists per country only, so each region shows its country figure'], ['Pharmacy dots', 'OpenStreetMap for all of Europe is too large for the weekly build']],
  nz: [['Smaller areas (territorial authorities)', 'their boundary files need a free Stats NZ account to download'], ['Official pharmacy list', 'pharmacies come from OpenStreetMap for now']],
};

export async function startWorld(map, ui, code) {
  const base = `world/${code}/`;
  const [meta, fc, pts, bm] = await Promise.all(['meta.json', 'regions.geojson', 'points.json', 'basemap.json'].map((f) => loadJSON(base + f)));
  // Europe: countries act like India's states (pick one to see its regions).
  const groups = meta.groups ? await loadJSON(base + 'groups.geojson') : null;
  // Europe has pharmacists per country instead of pharmacy locations.
  const measures = meta.per_pharmacist
    ? MEASURES.filter((m) => m.id !== 'per_10k').map((m) => (m.id === 'people_per_pharmacy' ? { ...m, label: 'People per pharmacist (country figure)', title: 'How many people share one pharmacist?', sub: 'Country figure, Eurostat' } : m))
    : MEASURES;
  let c = mapColors();

  // Background: the country, its neighbours, city names.
  map.addSource('w-near', { type: 'geojson', data: { type: 'FeatureCollection', features: bm.neighbours.map((n) => ({ type: 'Feature', properties: { name: n.name }, geometry: n.geometry })) } });
  map.addLayer({ id: 'w-near', type: 'fill', source: 'w-near', paint: { 'fill-color': c.neighbour } });
  map.addLayer({ id: 'w-near-line', type: 'line', source: 'w-near', paint: { 'line-color': c.neighbourLine, 'line-width': 0.8 } });
  await addWorldLand(map, 'w-near');

  // Regions.
  const byId = new Map(fc.features.map((f, i) => [i + 1, f.properties]));
  map.addSource('w-regions', { type: 'geojson', data: { type: 'FeatureCollection', features: fc.features.map((f, i) => ({ type: 'Feature', id: i + 1, properties: {}, geometry: f.geometry })) } });
  map.addLayer({ id: 'w-fill', type: 'fill', source: 'w-regions', paint: { 'fill-color': fillColor(c.scale, c), 'fill-opacity': 0.92 } });
  map.addLayer({ id: 'w-line', type: 'line', source: 'w-regions', paint: { 'line-color': c.stateLine, 'line-width': 0.8 } });
  map.addLayer({ id: 'w-focus', type: 'line', source: 'w-regions', paint: { 'line-color': c.focus, 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, 0] } });
  let byGroup = new Map();
  if (groups) {
    byGroup = new Map(groups.features.map((f, i) => [i + 1, f.properties]));
    map.addSource('w-groups', { type: 'geojson', data: { type: 'FeatureCollection', features: groups.features.map((f, i) => ({ type: 'Feature', id: i + 1, properties: {}, geometry: f.geometry })) } });
    map.addLayer({ id: 'w-gfill', type: 'fill', source: 'w-groups', paint: { 'fill-color': fillColor(c.scale, c), 'fill-opacity': 0.92 } }, 'w-line');
    map.addLayer({ id: 'w-gline', type: 'line', source: 'w-groups', paint: { 'line-color': c.border, 'line-width': 1 } });
  }
  if (bm.country) {
    map.addSource('w-country', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: bm.country } });
    map.addLayer({ id: 'w-border', type: 'line', source: 'w-country', paint: { 'line-color': c.border, 'line-width': 1.6 } });
  }

  // Pharmacy dots.
  map.addSource('w-dots', { type: 'geojson', data: { type: 'FeatureCollection', features: pts.rows.map((r, i) => ({ type: 'Feature', properties: { i }, geometry: { type: 'Point', coordinates: [r[0], r[1]] } })) } });
  map.addLayer({ id: 'w-dots', type: 'circle', source: 'w-dots', layout: { visibility: 'none' }, paint: { 'circle-color': '#d4860b', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 12, 5], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 0.8 } });

  // Names: regions, then cities.
  const text = (k) => ({ 'text-color': k.label, 'text-halo-color': k.labelHalo, 'text-halo-width': 1.4 });
  map.addSource('w-names', { type: 'geojson', data: { type: 'FeatureCollection', features: fc.features.map((f) => ({ type: 'Feature', properties: { name: f.properties.name }, geometry: { type: 'Point', coordinates: f.properties.label } })) } });
  map.addLayer({ id: 'w-names', type: 'symbol', source: 'w-names', layout: { 'text-field': ['get', 'name'], 'text-font': ['NotoSans-Regular'], 'text-size': 12, 'text-max-width': 7 }, paint: text(c) });

  // Panel.
  ui.layerList.innerHTML = `
    <div id="country-tabs"></div>
    ${groups ? `<div class="field"><label for="w-area">Area</label><select id="w-area"><option value="">All ${esc(meta.name)}</option>${groups.features.map((f) => `<option value="${esc(f.properties.id)}">${esc(f.properties.name)}</option>`).join('')}</select></div>
    <div class="field"><span class="field-label">Show by</span><div class="seg" role="group" aria-label="Show by"><button type="button" data-wlevel="group">Countries</button><button type="button" data-wlevel="region">Regions</button></div></div>` : ''}
    <div class="field"><label for="w-metric">Colour by</label><select id="w-metric">${measures.map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join('')}</select></div>
    <div class="switches">
      <label><input type="checkbox" id="w-dots-box" ${pts.rows.length ? '' : 'disabled'}><span><i class="dot" style="background:#d4860b"></i>Pharmacies <small>${pts.rows.length ? pts.rows.length.toLocaleString('en-GB') : 'none in this build'}</small></span></label>
    </div>
    <div id="ranking"></div>
    <p class="note">Data built ${esc(meta.built)}. ${esc(pts.label)}.</p>`;
  document.getElementById('soon').innerHTML = (SOON[code] || []).map(([t, why]) => `<li><strong>${esc(t)}</strong><span>${esc(why)}</span></li>`).join('');
  const sel = document.getElementById('w-metric');
  countryTabs(document.getElementById('country-tabs'), code, map);
  document.getElementById('w-dots-box').addEventListener('change', (e) => map.setLayoutProperty('w-dots', 'visibility', e.target.checked ? 'visible' : 'none'));

  let selected = null;
  let level = groups ? 'group' : 'region'; // Europe opens by country
  let area = null; // a country code, when one is picked (Europe)
  const inArea = (p) => !area || p.country === area;
  function paint() {
    const m = measures.find((x) => x.id === sel.value);
    const pal = m.worse === 'low' ? [...c.scale].reverse() : c.scale;
    const showGroups = level === 'group';
    if (groups) {
      map.setLayoutProperty('w-gfill', 'visibility', showGroups ? 'visible' : 'none');
      map.setLayoutProperty('w-fill', 'visibility', showGroups ? 'none' : 'visible');
      document.querySelectorAll('button[data-wlevel]').forEach((b) => b.classList.toggle('on', b.dataset.wlevel === level));
    }
    const pool = showGroups ? byGroup : new Map([...byId].filter(([, p]) => inArea(p)));
    const vals = [...pool.values()].map((p) => p[m.id]);
    const breaks = classBreaks(vals);
    if (showGroups) {
      for (const [id, p] of byGroup) map.setFeatureState({ source: 'w-groups', id }, { cls: classOf(p[m.id], breaks) });
      map.setPaintProperty('w-gfill', 'fill-color', fillColor(pal, c));
    } else {
      for (const [id, p] of byId) map.setFeatureState({ source: 'w-regions', id }, { cls: classOf(p[m.id], breaks), dim: !inArea(p) });
      map.setPaintProperty('w-fill', 'fill-color', fillColor(pal, c));
    }
    drawLegend(ui.legend, { ...m, label: m.label, source: sourceLine(code) }, vals, breaks, pal);
    title(m);
    const top = [...pool.entries()].filter(([, p]) => p.access_score != null).sort((a, b) => b[1].access_score - a[1].access_score).slice(0, 5);
    const where = showGroups ? 'Countries' : area ? `Regions of ${byGroupCode(area)?.name || area}` : 'Places';
    document.getElementById('ranking').innerHTML = `<p class="note"><strong>${esc(where)} where one more pharmacy would help most</strong></p>
      <ol class="results">${top.map(([id, p]) => `<li><button type="button" data-${showGroups ? 'gid' : 'id'}="${id}">${esc(p.name)}</button> ${n0(p.access_score)}</li>`).join('')}</ol>
      <p class="note">Access score: people per ${meta.per_pharmacist ? 'pharmacist' : 'pharmacy'} 60%, share aged 65 and over 40%.</p>`;
  }
  function byGroupCode(codeId) {
    return [...byGroup.values()].find((g) => g.id === codeId);
  }
  function pickArea(codeId) {
    area = codeId || null;
    const a = document.getElementById('w-area');
    if (a) a.value = area || '';
    if (area) {
      level = 'region';
      const b = byGroupCode(area)?.bbox;
      if (b) fitTo(map, [[b[0], b[1]], [b[2], b[3]]]);
    } else {
      const [w, s, e, n] = meta.bbox;
      fitTo(map, [[w, s], [e, n]]);
    }
    paint();
  }
  function title(m, place) {
    const by = level === 'group' ? 'country' : meta.unit;
    const where = area ? byGroupCode(area)?.name || area : meta.name;
    ui.crumbs.innerHTML = `<div class="path"><button type="button" data-go="india">India</button><i>/</i>${area ? `<button type="button" data-go="all">${esc(meta.name)}</button><i>/</i>` : ''}<span>${esc(where)}</span>${place ? `<i>/</i><span>${esc(place)}</span>` : ''}</div>
      <h1>${esc(m.title)}</h1><p>By ${esc(by)}, ${esc(where)}. ${esc(m.sub)}</p>`;
  }
  function open(id, fly) {
    const p = byId.get(id);
    if (!p) return;
    if (selected != null) map.setFeatureState({ source: 'w-regions', id: selected }, { selected: false });
    selected = id;
    map.setFeatureState({ source: 'w-regions', id }, { selected: true });
    if (fly) {
      const f = fc.features[id - 1];
      fitTo(map, bboxOf(f.geometry));
    }
    const rows = [
      ['Access score (0 to 100)', p.access_score == null ? 'n/a' : `${n0(p.access_score)} (rank ${p.access_rank} of ${byId.size})`],
      ['People', n0(p.people)],
      ['Aged 65 and over', p.share_65 == null ? 'n/a' : `${n0(p.aged_65_plus)} (${p.share_65}%)`],
      ...(meta.per_pharmacist
        ? [['People per pharmacist (country)', n0(p.people_per_pharmacy)]]
        : [['Pharmacies on record', n0(p.pharmacies)], ['Pharmacies per 10,000 people', p.per_10k == null ? 'n/a' : p.per_10k.toFixed(2)], ['People per pharmacy', p.people_per_pharmacy == null && p.people && pts.rows.length ? 'no pharmacy on record' : n0(p.people_per_pharmacy)]]),
    ];
    ui.showDetail(`${p.name}, ${meta.name}`, `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`);
    title(measures.find((x) => x.id === sel.value), p.name);
  }

  sel.addEventListener('change', paint);
  document.getElementById('w-area')?.addEventListener('change', (e) => pickArea(e.target.value));
  document.querySelectorAll('button[data-wlevel]').forEach((b) => b.addEventListener('click', () => {
    level = b.dataset.wlevel;
    if (level === 'group') area = null;
    paint();
  }));
  document.getElementById('ranking').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (b) open(Number(b.dataset.id), true);
    const g = e.target.closest('button[data-gid]');
    if (g) pickArea(byGroup.get(Number(g.dataset.gid)).id);
  });
  ui.crumbs.addEventListener('click', (e) => {
    if (e.target.closest('button[data-go=india]')) goToCountry('', map);
    if (e.target.closest('button[data-go=all]')) pickArea(null);
  });
  map.on('click', (e) => {
    const box = [[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]];
    const dot = map.getLayoutProperty('w-dots', 'visibility') === 'visible' ? map.queryRenderedFeatures(box, { layers: ['w-dots'] })[0] : null;
    if (dot) {
      const r = pts.rows[dot.properties.i];
      ui.showDetail('Pharmacy', `<table class="kv"><tr><td>Name</td><td>${esc(typeof r[2] === 'string' && !/^[nwr]\d+$/.test(r[2]) ? r[2] : 'Pharmacy (OpenStreetMap)')}</td></tr><tr><td>Source</td><td>${esc(pts.label)}</td></tr></table>`);
      return;
    }
    if (level === 'group') {
      const g = map.queryRenderedFeatures(e.point, { layers: ['w-gfill'] })[0];
      if (g) pickArea(byGroup.get(g.id).id);
      return;
    }
    const f = map.queryRenderedFeatures(e.point, { layers: ['w-fill'] })[0];
    if (!f) return;
    const p = byId.get(f.id);
    if (groups && !inArea(p)) return pickArea(p.country);
    open(f.id, false);
  });
  map.on('mousemove', 'w-fill', () => (map.getCanvas().style.cursor = 'pointer'));
  if (groups) map.on('mousemove', 'w-gfill', () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', 'w-fill', () => (map.getCanvas().style.cursor = ''));
  onThemeChange(() => {
    c = mapColors();
    map.setPaintProperty('sea', 'background-color', c.sea);
    map.setPaintProperty('w-near', 'fill-color', c.neighbour);
    map.setPaintProperty('w-near-line', 'line-color', c.neighbourLine);
    map.setPaintProperty('w-line', 'line-color', c.stateLine);
    map.setPaintProperty('w-focus', 'line-color', c.focus);
    if (map.getLayer('w-border')) map.setPaintProperty('w-border', 'line-color', c.border);
    if (map.getLayer('w-gline')) map.setPaintProperty('w-gline', 'line-color', c.border);
    for (const [k, v] of Object.entries(text(c))) map.setPaintProperty('w-names', k, v);
    paint();
  });

  addCredit('world', creditLine(code));
  paint();
  const [w, s, e, n] = meta.bbox;
  fitTo(map, [[w, s], [e, n]], !!window.__flight); // fly in when arriving from another country
  return { meta, open, paint };
}

const SOURCES = {
  sg: ['Sources: URA planning areas, HSA retail pharmacies (data.gov.sg), SingStat residents by planning area', 'Contains information from data.gov.sg (Singapore Open Data Licence v1.0) and SingStat'],
  nz: ['Sources: Stats NZ Census 2023 (via Figure.NZ), OpenStreetMap, Natural Earth', 'Population: Stats NZ (CC BY 4.0, via Figure.NZ); pharmacies © OpenStreetMap contributors (ODbL); regions: Natural Earth'],
  au: ['Sources: ABS estimated resident population, OpenStreetMap, Natural Earth', 'Population: Australian Bureau of Statistics (CC BY 4.0); pharmacies © OpenStreetMap contributors (ODbL); states: Natural Earth'],
  eu: ['Sources: Eurostat population 2025 and pharmacists by country, GISCO NUTS 2024', 'Population and pharmacists: Eurostat; regions © EuroGeographics for the administrative boundaries'],
};
const sourceLine = (code) => SOURCES[code][0];
const creditLine = (code) => SOURCES[code][1];

function bboxOf(geom) {
  let w = 180, s = 90, e = -180, n = -90;
  const walk = (cc) => {
    if (typeof cc[0] === 'number') {
      w = Math.min(w, cc[0]); e = Math.max(e, cc[0]); s = Math.min(s, cc[1]); n = Math.max(n, cc[1]);
    } else cc.forEach(walk);
  };
  walk(geom.coordinates);
  return [[w, s], [e, n]];
}
