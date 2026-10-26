// Puts every layer on the map and builds the Layers panel.
import { ScreenSpaceEventHandler, ScreenSpaceEventType, defined, BoundingSphere, HeadingPitchRange, Math as CMath } from 'cesium';
import { loadJSON } from '../data.js';
import { addDistricts, metricOptions } from './districts.js';
import { addPoints, POINT_STYLES } from './points.js';
import { pincodeLayer } from './pincodes.js';
import { esc } from '../ui.js';
import { addCredit } from '../credits.js';
import { districtDetail, pincodeDetail } from '../details.js';
import { rankingHtml } from '../insights.js';
import { setupMedicines } from '../medicine.js';

export async function registerLayers(viewer, ui) {
  const meta = await loadJSON('meta.json');
  const state = meta.states[0];
  const slug = state.slug;
  const pts = await loadJSON(`${slug}/points.json`);

  const districts = await addDistricts(viewer, ui, { slug });
  const pincodes = pincodeLayer(viewer, slug);
  const layers = {
    jak: addPoints(viewer, 'jak', pts.jak, (r) => ({
      title: 'Jan Aushadhi Kendra',
      rows: [['Store code', r[2]], ['Pincode', r[3]], ['Position', r[4] === 'pincode' ? 'Approximate (centre of pincode area)' : 'From address']],
    })),
    pharmacy: addPoints(viewer, 'pharmacy', pts.pharmacy, (r) => ({
      title: r[3] ? 'Pharmacy named Jan Aushadhi (OpenStreetMap)' : 'Pharmacy (OpenStreetMap)',
      rows: [['OpenStreetMap', `<a href="https://www.openstreetmap.org/${osmPath(r[2])}" target="_blank" rel="noopener">view source</a>`]],
      html: true,
    })),
    hospital: addPoints(viewer, 'hospital', pts.hospital, (r) => ({
      title: r[3] || 'Hospital (OpenStreetMap)',
      rows: [['Kind', 'Hospital'], ['OpenStreetMap', `<a href="https://www.openstreetmap.org/${osmPath(r[2])}" target="_blank" rel="noopener">view source</a>`]],
      html: true,
    })),
    gov: addPoints(viewer, 'gov', pts.gov, (r) => ({
      title: r[3] || 'Government health centre',
      rows: [['Type', GOV_TYPES[r[2]] || r[2]], ['Source', 'NIC HealthGIS']],
    })),
  };

  // Phase 4: drug quality alerts and the medicine check.
  layers.alerts = await setupMedicines(viewer, ui);

  // Panel: metric chooser and layer switches.
  ui.layerList.innerHTML = `
    <label for="metric">Colour districts by</label>
    <select id="metric">${metricOptions()}</select>
    <label><input type="checkbox" data-layer="districts" checked><span>District colours<small>${esc(state.name)}, ${state.districts} districts</small></span></label>
    <label><input type="checkbox" data-layer="pincodes"><span>Pincode totals<small>Kendras plus mapped pharmacies per pincode</small></span></label>
    ${Object.entries(POINT_STYLES).map(([k, s]) => `
      <label><input type="checkbox" data-layer="${k}" ${layers[k].count ? '' : 'disabled'}>
        <span><span class="dot" style="background:${s.color}"></span>${esc(s.label)}
        <small>${layers[k].count ? `${layers[k].count.toLocaleString('en-IN')} on the map` : 'Not available in this build'}</small></span></label>`).join('')}
    <label><input type="checkbox" data-layer="alerts" ${layers.alerts.count ? '' : 'disabled'}>
      <span><span class="dot" style="background:#f2b84b"></span>Drug quality alerts (CDSCO)
      <small>${layers.alerts.count ? `${layers.alerts.count.toLocaleString('en-IN')} samples; spurious ones in purple, at the reporting state` : 'Not available in this build'}</small></span></label>
    <div id="ranking"></div>
    <p class="note" id="data-date"></p>`;

  const ranking = ui.layerList.querySelector('#ranking');
  ranking.innerHTML = rankingHtml(districts.features, state.gap_weights);
  ranking.addEventListener('click', (ev) => {
    const name = ev.target.closest('button[data-district]')?.dataset.district;
    if (name) showDistrict(name);
  });

  const metricSel = ui.layerList.querySelector('#metric');
  metricSel.value = districts.metric;
  districts.paint(metricSel.value);
  metricSel.addEventListener('change', () => districts.paint(metricSel.value));

  ui.layerList.querySelectorAll('input[data-layer]').forEach((box) => {
    box.addEventListener('change', () => {
      const id = box.dataset.layer;
      if (id === 'districts') districts.setVisible(box.checked);
      else if (id === 'pincodes') pincodes.setVisible(box.checked);
      else layers[id].setVisible(box.checked);
    });
  });
  document.getElementById('data-date').textContent = `Data built ${meta.built}. See the About section for sources.`;

  // Credits for every data source on the map.
  addCredit('lgd', 'Boundaries: LGD via <a href="https://github.com/yashveeeeeeer/india-geodata" target="_blank" rel="noopener">india-geodata</a> (CC0)');
  addCredit('census', 'Population: Census of India 2011');
  addCredit('jak', 'Jan Aushadhi counts: PMBJP / PIB');
  addCredit('nic', 'Health centres: NIC HealthGIS (GODL-India)');
  addCredit('pin', 'Pincode areas: data.gov.in via india-geodata');
  if (pts.pharmacy.length || pts.hospital.length) addCredit('osm-data', 'Pharmacies and hospitals © OpenStreetMap contributors (ODbL)');

  // Click anything for details.
  const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position);
    if (!defined(picked)) return;
    const ad = picked.id?.ad || picked.id;
    if (ad?.kind === 'district') ui.showDetail(ad.props.name, districtDetail(ad.props, districts.features.length));
    else if (ad?.kind === 'pincode') ui.showDetail(`Pincode ${ad.props.pincode}`, pincodeDetail(ad.props));
    else if (ad?.kind === 'point') {
      const info = ad.info();
      ui.showDetail(info.title, info.raw || table(info.rows, info.html));
    }
  }, ScreenSpaceEventType.LEFT_CLICK);

  // Fly to a district and open its details (used by search and tests).
  function showDistrict(name) {
    const want = name.toLowerCase();
    const ents = districts.dataSource.entities.values.filter((e) => e.ad.props.name.toLowerCase() === want);
    if (!ents.length) return false;
    const pos = ents.flatMap((e) => e.polygon.hierarchy.getValue().positions);
    const sphere = BoundingSphere.fromPoints(pos);
    viewer.camera.flyToBoundingSphere(sphere, { duration: 1, offset: new HeadingPitchRange(0, CMath.toRadians(-90), sphere.radius * 3.2) });
    ui.showDetail(ents[0].ad.props.name, districtDetail(ents[0].ad.props, districts.features.length));
    return true;
  }

  return { meta, districts, pincodes, layers, points: pts, showDistrict };
}

const GOV_TYPES = { DHO: 'District hospital', THO: 'Taluka hospital', CHC: 'Community health centre', PHC: 'Primary health centre' };

function osmPath(id) {
  const kind = { n: 'node', w: 'way', r: 'relation' }[id[0]];
  return `${kind}/${id.slice(1)}`;
}

export function table(rows, html = false) {
  return `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${html ? v : esc(v)}</td></tr>`).join('')}</table>`;
}
