// Phase 4: drug quality alerts on the map (with a month timeline) and a
// medicine check that links a brand to its generic, its price cap and alerts.
import { loadJSON } from './data.js';
import { esc } from './ui.js';
import { addCredit } from './credits.js';

const FAIR = 'A not-of-standard-quality result is about one batch, not the whole company. Spurious samples were not made by the company named on the label, so they are shown at the state that reported them, never at a maker.';
const monthName = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

export async function setupMedicines(map, ui) {
  const [alerts, meds] = await Promise.all([loadJSON('alerts.json'), loadJSON('medicines.json')]);
  alerts.counts = alerts.counts || [];
  alerts.months = alerts.months || [];
  alerts.sources = alerts.sources || [];
  const section = document.getElementById('medicine-section');
  section.hidden = false;
  addCredit('cdsco', 'Drug alerts: CDSCO');
  if (meds.prices.length) addCredit('nppa', 'Price caps: NPPA');
  addCredit('anukalpa', 'Brand to generic: <a href="https://falakpat3l.github.io/anukalpa/" target="_blank" rel="noopener">anukalpa</a> (DISB, CC BY 4.0)');

  // Map layer: one dot per district (or reporting state), sized by count.
  // Only counts are published; details stay on CDSCO's own lists.
  let month = null;
  const total = (pid) => alerts.counts.filter((c) => c[2] === pid && (!month || c[0] === month)).reduce((t, c) => t + c[3], 0);
  map.addSource('alerts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'alerts-dots', type: 'circle', source: 'alerts', layout: { visibility: 'none' },
    paint: {
      'circle-color': ['case', ['get', 'spurious'], '#9b5de5', '#e0a21b'],
      'circle-opacity': 0.85,
      'circle-radius': ['interpolate', ['linear'], ['get', 'n'], 1, 4, 10, 8, 100, 18],
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ffffff',
    },
  });
  function draw() {
    const counts = new Map();
    for (const c of alerts.counts) {
      if (c[2] < 0 || (month && c[0] !== month)) continue;
      counts.set(c[2], (counts.get(c[2]) || 0) + c[3]);
    }
    const features = [...counts].map(([pid, n]) => {
      const p = alerts.places[pid];
      return { type: 'Feature', properties: { pid, n, spurious: p[2] === 'state' && p[3].startsWith('Reported in') }, geometry: { type: 'Point', coordinates: [p[0], p[1]] } };
    });
    map.getSource('alerts').setData({ type: 'FeatureCollection', features });
  }

  function sourceLinks(srcIds) {
    return srcIds
      .map((i) => alerts.sources[i])
      .filter(Boolean)
      .map((src) => `<li><a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.title)}</a></li>`)
      .join('');
  }

  function placeInfo(pid) {
    const p = alerts.places[pid];
    const rows = alerts.counts.filter((c) => c[2] === pid && (!month || c[0] === month));
    const byMonth = new Map();
    for (const c of rows) {
      const m = byMonth.get(c[0]) || { N: 0, S: 0, X: 0 };
      m[c[1]] += c[3];
      byMonth.set(c[0], m);
    }
    const ms = [...byMonth.keys()].sort().reverse();
    const table = ms
      .slice(0, 12)
      .map((m) => {
        const v = byMonth.get(m);
        const parts = [];
        if (v.N) parts.push(`${v.N} central lab`);
        if (v.S) parts.push(`${v.S} state lab`);
        if (v.X) parts.push(`${v.X} spurious`);
        return `<tr><td>${monthName(m)}</td><td>${parts.join(', ')}</td></tr>`;
      })
      .join('');
    const srcIds = [...new Set(alerts.months.filter((m) => byMonth.has(m.m)).flatMap((m) => m.src || []))];
    const n = total(pid);
    const prec = p[2] === 'state' ? 'state' : 'district';
    return {
      title: p[3] || 'Drug quality alerts',
      rows: [],
      raw: `<p class="note">${n} sample${n === 1 ? '' : 's'}${month ? ` in ${monthName(month)}` : ''}, counted at the ${prec} level.</p>
        <table class="kv">${table}</table>
        <p class="note">Product, batch and maker details are on CDSCO's own lists:</p><ul class="results">${sourceLinks(srcIds.slice(0, 6))}</ul>
        <p class="note">${FAIR}</p>`,
    };
  }

  // Timeline: one bar per month, click a bar to show only that month.
  const tl = document.getElementById('alert-timeline');
  function drawTimeline() {
    const ms = alerts.months;
    if (!ms.length) {
      tl.innerHTML = '<p class="note">No drug quality alerts in this build. See the data notes.</p>';
      return;
    }
    const max = Math.max(...ms.map((m) => m.nsq + m.spurious));
    tl.innerHTML = `<p class="note"><strong>Drug quality alerts per month</strong> (${ms.length} months). Click a bar to filter the map.</p>
      <div class="timeline">${ms.map((m) => `<span title="${monthName(m.m)}: ${m.nsq} not of standard quality, ${m.spurious} spurious" data-m="${m.m}" class="${m.m === month ? 'on' : ''}" style="height:${Math.max(4, ((m.nsq + m.spurious) / max) * 100)}%"></span>`).join('')}</div>
      <div class="ends note"><span>${monthName(ms[0].m)}</span><span>${monthName(ms[ms.length - 1].m)}</span></div>
      <p class="note">${month ? `Showing ${monthName(month)}. <button type="button" id="tl-all">Show all months</button>` : 'Showing all months.'}</p>`;
  }
  tl.addEventListener('click', (ev) => {
    if (ev.target.id === 'tl-all') month = null;
    else if (ev.target.dataset.m) month = ev.target.dataset.m === month ? null : ev.target.dataset.m;
    else return;
    drawTimeline();
    draw();
  });
  drawTimeline();
  draw();

  // Medicine check.
  const form = document.getElementById('med-form');
  const input = document.getElementById('med-input');
  const out = document.getElementById('med-result');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    out.innerHTML = '<p class="note">Looking up...</p>';
    out.innerHTML = await checkMedicine(input.value, meds, alerts);
  });

  return {
    count: alerts.counts.reduce((t, c) => t + c[3], 0),
    info: (pid) => placeInfo(pid),
    setVisible(on) {
      map.setLayoutProperty('alerts-dots', 'visibility', on ? 'visible' : 'none');
    },
    check: (q) => checkMedicine(q, meds, alerts),
  };
}

let brands = null;
async function brandList() {
  if (!brands) {
    try {
      const d = await loadJSON('anukalpa-IN.json');
      brands = d.rows.map((r) => {
        const salts = [];
        for (let i = 3; i < r.length; i += 2) salts.push([d.salts[r[i]], d.strengths[r[i + 1]] || '']);
        return { b: r[0], f: d.forms[r[1]] || '', s: salts };
      });
    } catch {
      brands = [];
    }
  }
  return brands;
}

const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);

export async function checkMedicine(query, meds, alerts) {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return '<p class="note">Type at least 3 letters.</p>';
  const list = await brandList();
  const brandHits = list.filter((x) => x.b.toLowerCase().startsWith(q)).slice(0, 3);
  let generics;
  let heading;
  if (brandHits.length) {
    const hit = brandHits[0];
    generics = hit.s.map((s) => s[0]);
    heading = `<p><strong>${esc(hit.b)}</strong> (${esc(hit.f)}) contains ${hit.s.map((s) => `<strong>${esc(s[0])}</strong> ${esc(s[1])}`).join(' + ')}.</p>`;
  } else {
    generics = [query.trim()];
    heading = `<p>Generic name: <strong>${esc(query.trim())}</strong></p>`;
  }
  const parts = [heading];
  for (const g of generics) {
    const key = words(g)[0] || '';
    const prices = meds.prices.filter((p) => words(p.formulation).includes(key)).slice(0, 6);
    parts.push(`<p class="note"><strong>${esc(g)}</strong></p>`);
    parts.push(
      prices.length
        ? `<table class="kv">${prices.map((p) => `<tr><td>${esc(p.formulation)} ${esc(p.form_strength)} (${esc(p.unit)})</td><td>Rs ${p.ceiling_rs}</td></tr>`).join('')}</table>
           <p class="note">NPPA ceiling price before GST. Order: ${esc(prices[0].order || 'see NPPA')}.</p>`
        : `<p class="note">${meds.prices.length ? 'Not in the NPPA ceiling price list (not price-controlled, or listed under another name).' : 'NPPA price list not loaded in this build.'}</p>`,
    );
    const hit = alertsFor(g, meds.alerts_by_generic || {});
    parts.push(
      hit
        ? `<p class="note">${hit.n} quality alert sample${hit.n > 1 ? 's mention' : ' mentions'} ${esc(g)} (latest ${monthName(hit.months[0][0])}). Each is about one batch. Details: ${monthLinks(hit.months, alerts)}.</p>`
        : `<p class="note">No quality alert samples mention ${esc(g)} in this build.</p>`,
    );
  }
  parts.push('<p class="note">Information only. Ask your doctor or pharmacist before changing a medicine.</p>');
  return parts.join('');
}

function alertsFor(generic, byGeneric) {
  const g = generic.toLowerCase();
  if (byGeneric[g]) return byGeneric[g];
  const first = words(g)[0];
  const key = Object.keys(byGeneric).find((k) => words(k)[0] === first);
  return key ? byGeneric[key] : null;
}

function monthLinks(months, alerts) {
  const links = months.slice(0, 3).map(([m]) => {
    const src = (alerts.months.find((x) => x.m === m) || {}).src || [];
    const s = alerts.sources[src[0]];
    return s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">CDSCO list, ${monthName(m)}</a>` : monthName(m);
  });
  return links.join(', ');
}
