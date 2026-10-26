// Puts every layer on the map and builds the Layers panel.
// The map opens on all of India. Picking a state flies there, ranks its
// districts, and loads its dots and pincode areas (kept per state, so phones
// never download all of India's dots at once).
import { ScreenSpaceEventHandler, ScreenSpaceEventType, defined, BoundingSphere, HeadingPitchRange, Math as CMath, Rectangle } from 'cesium';
import { loadJSON } from '../data.js';
import { addDistricts, metricOptions } from './districts.js';
import { addPoints, POINT_STYLES } from './points.js';
import { pincodeLayer } from './pincodes.js';
import { addBasemap } from './basemap.js';
import { esc } from '../ui.js';
import { addCredit } from '../credits.js';
import { districtDetail, pincodeDetail } from '../details.js';
import { rankingHtml } from '../insights.js';
import { setupMedicines } from '../medicine.js';
import { resetView } from '../map.js';

const EMPTY = { jak: [], pharmacy: [], hospital: [], gov: [] };

export async function registerLayers(viewer, ui) {
  const meta = await loadJSON('meta.json');
  await addBasemap(viewer);
  const districts = await addDistricts(viewer, ui);
  const pincodes = pincodeLayer(viewer);
  const stateBySlug = new Map(meta.states.map((s) => [s.slug, s]));
  let current = null; // the picked state, or null for all of India

  const layers = {
    jak: addPoints(viewer, 'jak', [], (r) => ({
      title: 'Jan Aushadhi Kendra',
      rows: [['Store code', r[2]], ['Pincode', r[3]], ['Position', r[4] === 'pincode' ? 'Approximate (centre of pincode area)' : 'From address']],
    })),
    pharmacy: addPoints(viewer, 'pharmacy', [], (r) => ({
      title: r[3] ? 'Pharmacy named Jan Aushadhi (OpenStreetMap)' : 'Pharmacy (OpenStreetMap)',
      rows: [['OpenStreetMap', `<a href="https://www.openstreetmap.org/${osmPath(r[2])}" target="_blank" rel="noopener">view source</a>`]],
      html: true,
    })),
    hospital: addPoints(viewer, 'hospital', [], (r) => ({
      title: r[3] || 'Hospital (OpenStreetMap)',
      rows: [['Kind', 'Hospital'], ['OpenStreetMap', `<a href="https://www.openstreetmap.org/${osmPath(r[2])}" target="_blank" rel="noopener">view source</a>`]],
      html: true,
    })),
    gov: addPoints(viewer, 'gov', [], (r) => ({
      title: r[3] || 'Government health centre',
      rows: [['Type', GOV_TYPES[r[2]] || r[2]], ['Source', 'NIC HealthGIS']],
    })),
  };
  layers.alerts = await setupMedicines(viewer, ui);

  // Panel: state picker, metric chooser and layer switches.
  ui.layerList.innerHTML = `
    <label for="state-pick">Show</label>
    <select id="state-pick"><option value="">All India (${meta.india.districts} districts)</option>
      ${meta.states.map((s) => `<option value="${s.slug}">${esc(s.name)}</option>`).join('')}</select>
    <label for="metric">Colour districts by</label>
    <select id="metric">${metricOptions()}</select>
    <label><input type="checkbox" data-layer="districts" checked><span>District colours<small id="district-note"></small></span></label>
    <label><input type="checkbox" data-layer="pincodes"><span>Pincode totals<small id="pincode-note"></small></span></label>
    ${Object.entries(POINT_STYLES).map(([k, s]) => `
      <label><input type="checkbox" data-layer="${k}">
        <span><span class="dot" style="background:${s.color}"></span>${esc(s.label)}<small data-count="${k}"></small></span></label>`).join('')}
    <label><input type="checkbox" data-layer="alerts" ${layers.alerts.count ? '' : 'disabled'}>
      <span><span class="dot" style="background:#f2b84b"></span>Drug quality alerts (CDSCO)
      <small>${layers.alerts.count ? `${layers.alerts.count.toLocaleString('en-IN')} samples; spurious ones in purple, at the reporting state` : 'Not available in this build'}</small></span></label>
    <div id="ranking"></div>
    <p class="note" id="data-date"></p>`;

  const $ = (sel) => ui.layerList.querySelector(sel);
  const ranking = $('#ranking');
  const metricSel = $('#metric');
  const statePick = $('#state-pick');

  function drawRanking() {
    const feats = current ? districts.features.filter((f) => f.properties.slug === current.slug) : districts.features;
    ranking.innerHTML = rankingHtml(feats, meta.india.gap_weights, current ? current.name : null);
  }

  function updateSwitches() {
    $('#district-note').textContent = current
      ? `${current.name}: ${current.districts} districts`
      : `All India: ${meta.india.districts} districts, ${meta.india.jak.toLocaleString('en-IN')} Kendras`;
    $('#pincode-note').textContent = current ? `${current.pincodes.toLocaleString('en-IN')} pincode areas` : 'Pick a state to see pincodes';
    $('input[data-layer=pincodes]').disabled = !current;
    for (const k of Object.keys(POINT_STYLES)) {
      const box = $(`input[data-layer=${k}]`);
      const n = current ? current.counts[k] : 0;
      box.disabled = !current || !n;
      if (box.disabled && box.checked) {
        box.checked = false;
        layers[k].setVisible(false);
      }
      const why = k === 'jak' ? 'Waiting for the store list (see known gaps)' : k === 'gov' && current && !current.centre_data ? 'No NIC data for this state' : 'Not available in this build';
      ui.layerList.querySelector(`[data-count=${k}]`).textContent = !current ? 'Pick a state to see these dots' : n ? `${n.toLocaleString('en-IN')} in ${current.name}` : why;
    }
  }

  async function pickState(slug, { fly = true } = {}) {
    current = slug ? stateBySlug.get(slug) : null;
    statePick.value = slug || '';
    districts.setFocus(current ? current.slug : null);
    if (current && metricSel.value === 'gap_score') metricSel.value = 'gap_score_state';
    if (!current && metricSel.value === 'gap_score_state') metricSel.value = 'gap_score';
    districts.paint(metricSel.value);
    drawRanking();
    updateSwitches();
    await pincodes.setState(current ? current.slug : null);
    const pts = current ? await loadJSON(`states/${current.slug}/points.json`) : EMPTY;
    for (const k of Object.keys(POINT_STYLES)) layers[k].setRows(pts[k] || []);
    if (fly) {
      if (current) {
        const [w, s, e, n] = current.bbox;
        viewer.camera.flyTo({ destination: Rectangle.fromDegrees(w, s, e, n), duration: 1.2 });
      } else resetView(viewer);
    }
  }

  ranking.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-lgd]');
    if (btn) showDistrict(Number(btn.dataset.lgd));
  });
  metricSel.value = districts.metric;
  metricSel.addEventListener('change', () => districts.paint(metricSel.value));
  statePick.addEventListener('change', () => pickState(statePick.value));

  ui.layerList.querySelectorAll('input[data-layer]').forEach((box) => {
    box.addEventListener('change', () => {
      const id = box.dataset.layer;
      if (id === 'districts') districts.setVisible(box.checked);
      else if (id === 'pincodes') pincodes.setVisible(box.checked);
      else layers[id].setVisible(box.checked);
    });
  });
  document.getElementById('data-date').textContent = `Data built ${meta.built}. See the About section for sources.`;
  await pickState(null, { fly: false });

  // Credits for every data source on the map.
  addCredit('lgd', 'District boundaries: LGD via <a href="https://github.com/yashveeeeeeer/india-geodata" target="_blank" rel="noopener">india-geodata</a> (CC0)');
  addCredit('census', 'Population: Census of India 2011');
  addCredit('jak', 'Jan Aushadhi counts: PMBJP / PIB');
  addCredit('nic', 'Health centres: NIC HealthGIS (GODL-India)');
  addCredit('pin', 'Pincode areas: data.gov.in via india-geodata');
  if (meta.sources?.osm_india?.ok) addCredit('osm-data', 'Pharmacies and hospitals © OpenStreetMap contributors (ODbL), via Geofabrik');

  // Click anything for details.
  const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position);
    if (!defined(picked)) return;
    const ad = picked.id?.ad || picked.id;
    if (ad?.kind === 'district') openDistrict(ad.props);
    else if (ad?.kind === 'pincode') ui.showDetail(`Pincode ${ad.props.pincode}`, pincodeDetail(ad.props));
    else if (ad?.kind === 'point') {
      const info = ad.info();
      ui.showDetail(info.title, info.raw || table(info.rows, info.html));
    }
  }, ScreenSpaceEventType.LEFT_CLICK);

  function openDistrict(p) {
    const st = stateBySlug.get(p.slug);
    ui.showDetail(`${p.name}, ${p.state}`, districtDetail(p, meta.india.districts, st ? st.districts : 0));
  }

  // Fly to a district (by LGD code, or by name) and open its details.
  function showDistrict(key) {
    const want = typeof key === 'number' ? null : String(key).toLowerCase();
    const ents = districts.dataSource.entities.values.filter((e) =>
      want == null ? e.ad.props.lgd === key : e.ad.props.name.toLowerCase() === want && (!current || e.ad.props.slug === current.slug),
    );
    const pool = ents.length ? ents : districts.dataSource.entities.values.filter((e) => want != null && e.ad.props.name.toLowerCase() === want);
    if (!pool.length) return false;
    const lgd = pool[0].ad.props.lgd;
    const mine = pool.filter((e) => e.ad.props.lgd === lgd);
    const pos = mine.flatMap((e) => e.polygon.hierarchy.getValue().positions);
    const sphere = BoundingSphere.fromPoints(pos);
    viewer.camera.flyToBoundingSphere(sphere, { duration: 1, offset: new HeadingPitchRange(0, CMath.toRadians(-90), sphere.radius * 3.2) });
    openDistrict(mine[0].ad.props);
    return true;
  }

  return {
    meta, districts, pincodes, layers, showDistrict, pickState,
    get state() {
      return current;
    },
  };
}

const GOV_TYPES = { DHO: 'District hospital', THO: 'Taluka hospital', CHC: 'Community health centre', PHC: 'Primary health centre' };

function osmPath(id) {
  const kind = { n: 'node', w: 'way', r: 'relation' }[id[0]];
  return `${kind}/${id.slice(1)}`;
}

export function table(rows, html = false) {
  return `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${html ? v : esc(v)}</td></tr>`).join('')}</table>`;
}
