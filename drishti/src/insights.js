// Phase 3: per-person measures, the gap score, and the ranking list.
import { addMetrics } from './metrics.js';
import { esc } from './ui.js';

const GAP_DOC = 'https://github.com/falakpat3l/aushadhi-drishti/blob/main/drishti/docs/gap-score.md';
const num = (v, d = 0) => (v == null ? 'n/a' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d }));

addMetrics([
  {
    id: 'gap_score',
    label: 'Gap score: where a new generic store helps most',
    get: (p) => p.gap_score,
    fmt: (v) => num(v),
    palette: 'warn',
    note: '0 = well served, 100 = biggest gap, compared with other districts in the state.',
  },
  {
    id: 'people_per_kendra',
    label: 'People per Jan Aushadhi Kendra',
    get: (p) => p.people_per_kendra,
    fmt: (v) => num(v),
    palette: 'warn',
  },
  {
    id: 'kendras_per_lakh',
    label: 'Jan Aushadhi Kendras per 1 lakh people',
    get: (p) => p.kendras_per_lakh,
    fmt: (v) => num(v, 2),
  },
  {
    id: 'outlets_per_10k',
    label: 'Medicine outlets per 10,000 people',
    get: (p) => (p.osm_pharmacy ? p.outlets_per_10k : null),
    fmt: (v) => num(v, 2),
    note: 'Kendras plus pharmacies mapped in OpenStreetMap. OSM misses many shops, so this is a floor.',
  },
  {
    id: 'centres_per_kendra',
    label: 'Government health centres per Kendra',
    get: (p) => p.centres_per_kendra,
    fmt: (v) => num(v, 1),
    palette: 'warn',
  },
]);

export function insightRows(p, total) {
  return [
    ['Gap score (0 to 100)', p.gap_score == null ? 'n/a' : `${num(p.gap_score)} (rank ${p.gap_rank} of ${total})`],
    ['People per Kendra', num(p.people_per_kendra)],
    ['Kendras per 1 lakh people', num(p.kendras_per_lakh, 2)],
    ['Medicine outlets per 10,000 people', p.osm_pharmacy ? num(p.outlets_per_10k, 2) : 'needs OSM data'],
    ['Government health centres per Kendra', num(p.centres_per_kendra, 1)],
  ];
}

export function pincodeHintsHtml(p) {
  const hints = p.pincode_hints || [];
  if (!hints.length) return '';
  return `<p class="note"><strong>Pincodes to look at first</strong>: government health centres, but no Kendra or mapped pharmacy yet.</p>
    <ol class="results">${hints.map((h) => `<li>${esc(h.pincode)} ${esc(h.office)} (${h.centres} centre${h.centres > 1 ? 's' : ''})</li>`).join('')}</ol>`;
}

export function rankingHtml(features, weights) {
  const top = features
    .map((f) => f.properties)
    .filter((p) => p.gap_rank)
    .sort((a, b) => a.gap_rank - b.gap_rank)
    .slice(0, 5);
  const w = Object.entries(weights || {})
    .map(([k, v]) => `${{ people_per_kendra: 'people per Kendra', outlets_per_10k: 'outlets per person', centres_per_kendra: 'health centres per Kendra' }[k]} ${Math.round(v * 100)}%`)
    .join(', ');
  return `<p class="note"><strong>Most in need of a generic store</strong></p>
    <ol class="results">${top.map((p) => `<li><button type="button" data-district="${esc(p.name)}">${esc(p.name)}</button> ${num(p.gap_score)}</li>`).join('')}</ol>
    <p class="note">Score made from: ${esc(w)}. <a href="${GAP_DOC}" target="_blank" rel="noopener">How the gap score works</a></p>`;
}
