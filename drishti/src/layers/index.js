// Puts every layer on the map and builds the panel.
// The map opens on all of India. Tapping a state (or picking it from the
// list) zooms to it, ranks its districts and loads its dots and pincodes.
// Inside a state, tapping a district opens its details.
import { loadJSON } from '../data.js';
import { addDistricts, metricOptions } from './districts.js';
import { addPoints, POINT_STYLES } from './points.js';
import { pincodeLayer } from './pincodes.js';
import { addStates } from './states.js';
import { addBasemap } from './basemap.js';
import { esc } from '../ui.js';
import { addCredit } from '../credits.js';
import { districtDetail, pincodeDetail } from '../details.js';
import { rankingHtml } from '../insights.js';
import { setupMedicines } from '../medicine.js';
import { aboutMetric } from '../metrics.js';
import { COUNTRIES, goToCountry } from '../world.js';
import { resetView, fitTo } from '../map.js';

const EMPTY = { jak: [], pharmacy: [], hospital: [], gov: [] };
const GOV_TYPES = { DHO: 'District hospital', THO: 'Taluka hospital', CHC: 'Community health centre', PHC: 'Primary health centre' };

export async function registerLayers(map, ui) {
  const meta = await loadJSON('meta.json');
  await addBasemap(map);
  const districts = await addDistricts(map, ui);
  const pincodes = pincodeLayer(map, ui);
  const states = await addStates(map, ui);
  let level = 'district'; // 'state', 'district' or 'pincode'
  const stateBySlug = new Map(meta.states.map((s) => [s.slug, s]));
  let current = null; // the picked state, or null for all of India

  const osmLink = (id) => `<a href="https://www.openstreetmap.org/${osmPath(id)}" target="_blank" rel="noopener">view on OpenStreetMap</a>`;
  const layers = {
    gov: addPoints(map, 'gov', [], (r) => ({ title: r[3] || 'Government health centre', rows: [['Type', GOV_TYPES[r[2]] || r[2]], ['Source', 'NIC HealthGIS']] })),
    hospital: addPoints(map, 'hospital', [], (r) => ({ title: r[3] || 'Hospital', rows: [['Kind', 'Hospital (OpenStreetMap)'], ['Source', osmLink(r[2])]], html: true })),
    pharmacy: addPoints(map, 'pharmacy', [], (r) => ({ title: r[3] ? 'Pharmacy named Jan Aushadhi' : 'Pharmacy', rows: [['Kind', 'Pharmacy (OpenStreetMap)'], ['Source', osmLink(r[2])]], html: true })),
    jak: addPoints(map, 'jak', [], (r) => ({ title: 'Jan Aushadhi Kendra', rows: [['Store code', r[2]], ['Pincode', r[3]]] })),
  };
  layers.alerts = await setupMedicines(map, ui);

  ui.layerList.innerHTML = `
    <div class="field"><label for="country-pick">Country</label><select id="country-pick">${COUNTRIES.map((k) => `<option value="${k.code}">${k.name}</option>`).join('')}</select></div>
    <div class="field"><label for="state-pick">Area</label>
      <select id="state-pick"><option value="">All India</option>
        ${meta.states.map((s) => `<option value="${s.slug}">${esc(s.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="metric">Colour by</label><select id="metric">${metricOptions()}</select></div>
    <div class="field"><span class="field-label">Show by</span>
      <div class="seg" role="group" aria-label="Show by">
        <button type="button" data-level="state">States</button><button type="button" data-level="district">Districts</button><button type="button" data-level="pincode">Pincodes</button>
      </div></div>
    <div class="switches">
      ${Object.entries(POINT_STYLES).map(([k, s]) => `
        <label><input type="checkbox" data-layer="${k}"><span><i class="dot" style="background:${s.color}"></i>${esc(s.label)} <small data-count="${k}"></small></span></label>`).join('')}
      <label><input type="checkbox" data-layer="alerts"><span><i class="dot" style="background:#e0a21b"></i>Drug quality alerts <small>${layers.alerts.count.toLocaleString('en-IN')} samples</small></span></label>
    </div>
    <p class="hint" id="state-hint">Tap a state on the map, or pick one above, to see its pincodes, hospitals and health centres.</p>
    <div id="ranking"></div>
    <p class="note" id="data-date"></p>`;

  // Things the map cannot show yet, listed once at the bottom of the panel
  // instead of as greyed-out switches.
  const SOON = [
    ['Jan Aushadhi store locations', 'waiting for permission from PMBI to reuse their store list'],
    ['Drug alert details', 'CDSCO allows counts only; permission for product and batch details has been asked'],
    ['Medicine price caps', 'the NPPA list could not be reached yet'],
    ['Licensed pharmacies per district', 'states do not publish their licence lists openly'],
    ['Which pharmacies stock a medicine', 'pharmacies would opt in; designed, not built yet'],
  ];
  const soonList = document.getElementById('soon');
  function drawSoon() {
    const items = [...SOON];
    if (!layers.alerts.count) items.splice(1, 1, ['Drug quality alerts', 'CDSCO lists were not read in this build']);
    const osmCount = meta.states.reduce((t, s) => t + s.counts.pharmacy + s.counts.hospital, 0);
    if (!osmCount) items.push(['Pharmacies and hospitals from OpenStreetMap', 'added on the next weekly refresh']);
    if (current && !current.centre_data) items.push([`Health centres in ${current.name}`, 'not in the NIC health centre file']);
    soonList.innerHTML = items.map(([t, why]) => `<li><strong>${esc(t)}</strong><span>${esc(why)}</span></li>`).join('');
  }

  const $ = (sel) => ui.layerList.querySelector(sel);
  const ranking = $('#ranking');
  const metricSel = $('#metric');
  const statePick = $('#state-pick');

  // The title card on the map: where you are, a plain headline, one line of context.
  let openName = null;
  function crumbs(district = openName) {
    openName = district;
    const parts = [`<button type="button" data-go="india">India</button>`];
    if (current) parts.push(`<button type="button" data-go="state">${esc(current.name)}</button>`);
    if (district) parts.push(`<span>${esc(district)}</span>`);
    const a = aboutMetric(level === 'pincode' ? 'outlets_per_10k' : metricSel.value);
    const by = { state: 'By state', district: 'By district', pincode: 'By pincode' }[level];
    const title = level === 'pincode' ? 'Where are the medicine outlets?' : a.title;
    ui.crumbs.innerHTML = `<div class="path">${parts.join('<i>/</i>')}</div>
      <h1>${esc(title)}</h1>
      <p>${esc(by)}${current ? `, ${esc(current.name)}` : ', India'}. ${esc(level === 'pincode' ? 'Kendras plus mapped pharmacies' : a.sub)}</p>`;
  }

  function setLevel(l) {
    level = l;
    ui.layerList.querySelectorAll('button[data-level]').forEach((b) => b.classList.toggle('on', b.dataset.level === l));
    states.setVisible(l === 'state');
    districts.setVisible(l !== 'state');
    pincodes.setVisible(l === 'pincode');
    if (l === 'state') states.paint(metricSel.value);
    else districts.paint(metricSel.value);
    drawRanking();
    crumbs();
  }

  function drawRanking() {
    if (level === 'state') {
      const top = [...states.bySlug.values()].filter((p) => p.gap_rank).sort((a, b) => a.gap_rank - b.gap_rank).slice(0, 5);
      ranking.innerHTML = `<p class="note"><strong>States most in need of generic stores</strong></p>
        <ol class="results">${top.map((p) => `<li><button type="button" data-slug="${p.slug}">${esc(p.name)}</button> ${Math.round(p.gap_score)}</li>`).join('')}</ol>`;
      return;
    }
    const feats = current ? districts.features.filter((f) => f.properties.slug === current.slug) : districts.features;
    ranking.innerHTML = rankingHtml(feats, meta.india.gap_weights, current ? current.name : null);
  }

  // Only switches that can do something right now are shown.
  function updateSwitches() {
    const show = (box, on) => {
      box.closest('label').hidden = !on;
      if (!on && box.checked) {
        box.checked = false;
        box.dispatchEvent(new Event('change'));
      }
    };
    $('button[data-level=pincode]').hidden = !current;
    if (!current && level === 'pincode') setLevel('district');
    for (const k of Object.keys(POINT_STYLES)) {
      const n = current ? current.counts[k] : 0;
      show($(`input[data-layer=${k}]`), n > 0);
      $(`[data-count=${k}]`).textContent = n ? n.toLocaleString('en-IN') : '';
    }
    show($('input[data-layer=alerts]'), layers.alerts.count > 0);
    $('#state-hint').hidden = !!current;
    drawSoon();
  }

  async function pickState(slug, { fly = true } = {}) {
    current = slug ? stateBySlug.get(slug) || null : null;
    statePick.value = current ? current.slug : '';
    districts.select(null);
    if (current && level === 'state') setLevel('district');
    districts.setFocus(current ? current.slug : null);
    if (current && metricSel.value === 'gap_score') metricSel.value = 'gap_score_state';
    if (!current && metricSel.value === 'gap_score_state') metricSel.value = 'gap_score';
    if (level === 'state') states.paint(metricSel.value);
    else districts.paint(metricSel.value);
    drawRanking();
    updateSwitches();
    crumbs(null);
    if (fly) {
      if (current) {
        const [w, s, e, n] = current.bbox;
        fitTo(map, [[w, s], [e, n]]);
      } else resetView(map);
    }
    await pincodes.setState(current ? current.slug : null);
    const pts = current ? await loadJSON(`states/${current.slug}/points.json`) : EMPTY;
    for (const k of Object.keys(POINT_STYLES)) layers[k].setRows(pts[k] || []);
  }

  function openDistrict(p, fly) {
    const st = stateBySlug.get(p.slug);
    districts.select(p.lgd);
    crumbs(p.name);
    if (fly) {
      const f = districts.features.find((x) => x.properties.lgd === p.lgd);
      if (f) fitTo(map, bboxOf(f.geometry));
    }
    ui.showDetail(`${p.name}, ${p.state}`, districtDetail(p, meta.india.districts, st ? st.districts : 0));
  }

  // Fly to a district (by LGD code, or by name) and open its details.
  function showDistrict(key) {
    const all = [...districts.byLgd.values()];
    let p = typeof key === 'number' ? districts.byLgd.get(key) : null;
    if (!p && typeof key === 'string') {
      const want = key.toLowerCase();
      p = all.find((d) => d.name.toLowerCase() === want && (!current || d.slug === current.slug)) || all.find((d) => d.name.toLowerCase() === want);
    }
    if (!p) return false;
    if (!current || current.slug !== p.slug) pickState(p.slug, { fly: false });
    openDistrict(p, true);
    return true;
  }

  // Taps and clicks: dots first, then pincodes, then districts.
  map.on('click', (e) => {
    const dotLayers = Object.values(layers).filter((l) => l.layerId).map((l) => l.layerId).filter((id) => map.getLayoutProperty(id, 'visibility') === 'visible');
    const box = [[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]];
    const dot = dotLayers.length ? map.queryRenderedFeatures(box, { layers: dotLayers })[0] : null;
    if (dot) {
      const kind = dot.layer.id.replace('dots-', '');
      const info = layers[kind].info(dot.properties.i);
      ui.showDetail(info.title, table(info.rows, info.html));
      return;
    }
    const alert = map.getLayer('alerts-dots') && map.getLayoutProperty('alerts-dots', 'visibility') === 'visible' ? map.queryRenderedFeatures(box, { layers: ['alerts-dots'] })[0] : null;
    if (alert) {
      const info = layers.alerts.info(alert.properties.pid);
      ui.showDetail(info.title, info.raw);
      return;
    }
    if (level === 'state') {
      const sf = map.queryRenderedFeatures(e.point, { layers: ['states-fill'] })[0];
      if (sf) pickState(states.slugAt(sf.id));
      return;
    }
    const d = map.queryRenderedFeatures(e.point, { layers: ['districts-fill'] })[0];
    if (!d) return;
    const p = districts.byLgd.get(d.id);
    if (!p) return;
    if (!current || current.slug !== p.slug) {
      pickState(p.slug);
      return;
    }
    const pin = map.getLayoutProperty('pincodes-fill', 'visibility') === 'visible' ? map.queryRenderedFeatures(e.point, { layers: ['pincodes-fill'] })[0] : null;
    if (pin && pincodes.byPin.get(pin.id)) {
      ui.showDetail(`Pincode ${pin.id}`, pincodeDetail(pincodes.byPin.get(pin.id)));
      return;
    }
    openDistrict(p, false);
  });

  ranking.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-lgd]');
    if (btn) showDistrict(Number(btn.dataset.lgd));
    const st = ev.target.closest('button[data-slug]');
    if (st) pickState(st.dataset.slug);
  });
  ui.crumbs.addEventListener('click', (ev) => {
    const go = ev.target.closest('button[data-go]')?.dataset.go;
    if (go === 'india') pickState(null);
    if (go === 'state' && current) pickState(current.slug);
  });
  metricSel.value = districts.metric;
  metricSel.addEventListener('change', () => {
    if (level === 'state') states.paint(metricSel.value);
    else districts.paint(metricSel.value);
    crumbs();
  });
  ui.layerList.querySelectorAll('button[data-level]').forEach((b) => b.addEventListener('click', () => setLevel(b.dataset.level)));
  statePick.addEventListener('change', () => pickState(statePick.value));
  $('#country-pick').addEventListener('change', (e) => goToCountry(e.target.value));
  ui.layerList.querySelectorAll('input[data-layer]').forEach((box) => {
    box.addEventListener('change', () => {
      const id = box.dataset.layer;
      layers[id].setVisible(box.checked);
    });
  });
  document.getElementById('data-date').textContent = `Data built ${meta.built}.`;
  await pickState(null, { fly: false });
  setLevel('district');

  addCredit('lgd', 'Districts: LGD via <a href="https://github.com/yashveeeeeeer/india-geodata" target="_blank" rel="noopener">india-geodata</a>');
  addCredit('census', 'Population: Census 2011');
  addCredit('jak', 'Kendra counts: PMBJP / PIB');
  addCredit('nic', 'Health centres: NIC HealthGIS');
  addCredit('pin', 'Pincodes: data.gov.in');
  if (meta.sources?.osm_india?.ok) addCredit('osm-data', '© OpenStreetMap contributors (ODbL), via Geofabrik');

  return {
    meta, districts, pincodes, layers, showDistrict, pickState,
    get state() {
      return current;
    },
  };
}

function bboxOf(geom) {
  let w = 180, s = 90, e = -180, n = -90;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]);
    } else c.forEach(walk);
  };
  walk(geom.coordinates);
  return [[w, s], [e, n]];
}

function osmPath(id) {
  const kind = { n: 'node', w: 'way', r: 'relation' }[id[0]];
  return `${kind}/${id.slice(1)}`;
}

export function table(rows, html = false) {
  return `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${html ? v : esc(v)}</td></tr>`).join('')}</table>`;
}
