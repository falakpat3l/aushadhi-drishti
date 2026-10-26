// The details shown when a district or pincode is clicked.
import { esc } from './ui.js';
import { insightRows, pincodeHintsHtml } from './insights.js';

const n = (v) => (v == null ? 'n/a' : Number(v).toLocaleString('en-IN'));
export const day = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'n/a');

export function districtDetail(p, total = 0, stateTotal = 0) {
  const rows = [
    ['Population (Census 2011)', p.pop_estimated ? `${n(p.pop2011)} (partly estimated)` : n(p.pop2011)],
    [`Jan Aushadhi Kendras (as on ${day(p.jak_as_on)})`, n(p.jak_official)],
    ['Pharmacies mapped in OpenStreetMap', n(p.osm_pharmacy)],
    ['  of which named Jan Aushadhi', n(p.osm_jak)],
    ['Hospitals mapped in OpenStreetMap', n(p.osm_hospital)],
    ...(p.no_centre_data ? [['Government health centres', 'no NIC data for this state']] : [
      ['Government hospitals', n(p.hospital_gov)],
      ['Community health centres', n(p.chc)],
      ['Primary health centres', n(p.phc)],
      ['Sub-centres', n(p.subcentre)],
    ]),
  ];
  const extra = insightRows(p, total, stateTotal);
  const notes = (p.notes || []).map((t) => `<p class="note">${esc(t)}</p>`).join('');
  return `<table class="kv">${[...extra, ...rows].map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>${notes}${pincodeHintsHtml(p)}
    <p class="note">OpenStreetMap is mapped by volunteers and misses many shops, so its counts are a floor, not a full count.</p>`;
}

export function pincodeDetail(p) {
  const rows = [
    ['Post office', p.office || 'n/a'],
    ['Jan Aushadhi Kendras placed here', n(p.jak)],
    ['Pharmacies mapped in OpenStreetMap', n(p.osm_pharmacy)],
    ['Hospitals mapped in OpenStreetMap', n(p.osm_hospital)],
    ['Government health centres', n(p.gov_facilities)],
  ];
  return `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`;
}
