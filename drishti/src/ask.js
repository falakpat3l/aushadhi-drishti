// Phase 5: the "Ask the map" box. Rules first (askRules.js). If the rules
// cannot read a question and an AI helper is running locally (npm run dev
// with a key in .env), the question is passed to it. The live site has no AI.
import { parseQuestion, rank, value, measureLabel } from './askRules.js';
import { esc } from './ui.js';
import { checkMedicine } from './medicine.js';
import { loadJSON } from './data.js';

const EXAMPLES = [
  'districts in Gujarat with the fewest generic stores per person',
  'where in India is a new generic store most needed',
  'compare Bharuch and Surat',
  'which pincodes in Bharuch need a store',
  'price of Dolo 650',
];

const fmt = (v) => (v == null ? 'n/a' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }));

export function setupAsk(ui, layers) {
  const form = document.getElementById('ask');
  const input = document.getElementById('ask-input');
  form.hidden = false;
  window.dispatchEvent(new Event('resize')); // header height changed
  const districts = layers.districts.features.map((f) => f.properties);
  const find = (name, state) => districts.find((x) => x.name === name && (!state || x.state === state)) || districts.find((x) => x.name === name);

  async function answer(question) {
    const plan = parseQuestion(question, districts, layers.state ? layers.state.name : null);
    if (plan.kind === 'rank') {
      const st = layers.meta.states.find((s) => s.name === plan.state);
      if ((st ? st.slug : null) !== (layers.state ? layers.state.slug : null)) await layers.pickState(st ? st.slug : null);
      const rows = rank(districts, plan.measure, plan.order, plan.n, plan.state);
      if (!rows.length) return `<p>No data yet for ${esc(plan.label)} in this build.</p>`;
      const sel = document.getElementById('metric');
      const shown = plan.measure === 'gap_score' && plan.state ? 'gap_score_state' : plan.measure;
      if (sel && [...sel.options].some((o) => o.value === shown)) {
        sel.value = shown;
        sel.dispatchEvent(new Event('change'));
      }
      const dir = plan.order === 'asc' ? 'lowest' : 'highest';
      return `<p>Districts in ${esc(plan.state || 'India')} with the ${dir} <strong>${esc(plan.label)}</strong>:</p>
        <ol class="results">${rows.map((r) => `<li><button type="button" data-lgd="${r.lgd}">${esc(r.name)}</button>${plan.state ? '' : `, ${esc(r.state)}`} ${fmt(r.v)}</li>`).join('')}</ol>
        <p class="note">The map is now coloured by this measure. Population is from Census 2011.</p>`;
    }
    if (plan.kind === 'district') {
      const d = find(plan.district, plan.state);
      layers.showDistrict(d.lgd);
      const line = plan.measure ? `<p>${esc(plan.district)}: <strong>${esc(measureLabel(plan.measure))}</strong> ${fmt(value(d, plan.measure))}.</p>` : '';
      return `${line}<p class="note">Details for ${esc(plan.district)} are open below.</p>`;
    }
    if (plan.kind === 'compare') {
      const ds = plan.districts.map((n) => find(n, layers.state ? layers.state.name : null));
      const ids = ['pop2011', 'jak_official', 'kendras_per_lakh', 'people_per_kendra', 'gov_centres', 'gap_score'];
      return `<table class="kv"><tr><td></td>${ds.map((d) => `<td>${esc(d.name)}</td>`).join('')}</tr>
        ${ids.map((id) => `<tr><td>${esc(measureLabel(id))}</td>${ds.map((d) => `<td>${fmt(value(d, id))}</td>`).join('')}</tr>`).join('')}</table>`;
    }
    if (plan.kind === 'pincodes') {
      const d = find(plan.district, plan.state);
      const hints = d.pincode_hints || [];
      layers.showDistrict(d.lgd);
      return hints.length
        ? `<p>Pincodes in ${esc(plan.district)} with government health centres but no Kendra or mapped pharmacy:</p>
           <ol class="results">${hints.map((h) => `<li>${esc(h.pincode)} ${esc(h.office)} (${h.centres})</li>`).join('')}</ol>`
        : `<p>No such pincodes found in ${esc(plan.district)} in this build.</p>`;
    }
    if (plan.kind === 'medicine') {
      const [meds, alerts] = await Promise.all([loadJSON('medicines.json'), loadJSON('alerts.json')]);
      return checkMedicine(plan.query, meds, alerts);
    }
    const ai = await askAI(question, districts);
    if (ai) return `<p class="note">The built-in rules could not read this, so a local AI model answered. Check it against the map.</p><p>${esc(ai)}</p>`;
    return `<p>I could not read that question. Try one of these:</p>
      <ol class="results">${EXAMPLES.map((e) => `<li><button type="button" data-ask="${esc(e)}">${esc(e)}</button></li>`).join('')}</ol>`;
  }

  async function run(question) {
    if (!question.trim()) return;
    ui.showAnswer('<p class="note">Thinking...</p>');
    ui.showAnswer(await answer(question));
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    run(input.value);
  });
  document.getElementById('answer').addEventListener('click', (ev) => {
    const d = ev.target.closest('button[data-lgd]')?.dataset.lgd;
    const a = ev.target.closest('button[data-ask]')?.dataset.ask;
    if (d) layers.showDistrict(Number(d));
    if (a) {
      input.value = a;
      run(a);
    }
  });
  return { run, answer };
}

// Only exists when running `npm run dev` with an AI set up in .env.
async function askAI(question, districts) {
  if (!import.meta.env.DEV) return null;
  try {
    const table = districts.map((d) => [d.name, d.pop2011, d.jak_official, d.kendras_per_lakh, d.osm_pharmacy, d.phc + d.chc + d.hospital_gov, d.gap_score, d.state].join(',')).join('\n');
    const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, table }) });
    if (!r.ok) return null;
    return (await r.json()).answer || null;
  } catch {
    return null;
  }
}
