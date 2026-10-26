// Phase 5: "Ask the map". Turns a plain question into a query on the local
// data, using simple rules. No outside service is needed. This file has no
// map code in it, so it can be tested on its own (tests/ask.test.mjs).

const MEASURES = [
  // id, words that point to it, which direction "fewest" means, label
  { id: 'gap_score', words: ['gap', 'need', 'needed', 'underserved', 'under served', 'shortage', 'new store', 'new kendra', 'new pharmacy', 'open a'], label: 'gap score' },
  { id: 'kendras_per_lakh', perPerson: true, words: ['generic', 'jan aushadhi', 'janaushadhi', 'kendra', 'pmbjk', 'jak'], label: 'Jan Aushadhi Kendras per 1 lakh people' },
  { id: 'jak_official', words: ['generic', 'jan aushadhi', 'janaushadhi', 'kendra', 'pmbjk', 'jak'], label: 'Jan Aushadhi Kendras' },
  { id: 'outlets_per_10k', perPerson: true, words: ['pharmac', 'chemist', 'medical store', 'medicine shop', 'outlet', 'shop'], label: 'medicine outlets per 10,000 people' },
  { id: 'osm_pharmacy', words: ['pharmac', 'chemist', 'medical store', 'medicine shop', 'outlet', 'shop'], label: 'pharmacies mapped in OpenStreetMap' },
  { id: 'centres_per_kendra', perPerson: false, words: ['health centre', 'health center', 'phc', 'chc', 'clinic'], label: 'government health centres per Kendra', onlyPer: 'kendra' },
  { id: 'gov_centres', words: ['health centre', 'health center', 'phc', 'chc', 'clinic', 'hospital'], label: 'government health centres' },
  { id: 'people_per_kendra', words: ['people per kendra', 'people per store', 'people per generic'], label: 'people per Jan Aushadhi Kendra' },
  { id: 'pop2011', words: ['population', 'people live', 'populous'], label: 'population (2011)' },
];

const PER_PERSON = /per (person|people|capita|head|lakh|10,?000|thousand|population)|per-capita|by population|for (its|their) population|relative to population/;

export function value(p, id) {
  if (id === 'gov_centres') return p.no_centre_data ? null : p.phc + p.chc + p.hospital_gov;
  if (id === 'outlets_per_10k' && !p.osm_pharmacy) return null;
  return p[id] ?? null;
}

// Names too common to read as a district on their own (Delhi has districts
// called North, East, Central...); they still match as "North district" etc.
const VAGUE = new Set(['north', 'south', 'east', 'west', 'central', 'north east', 'north west', 'south east', 'south west', 'mon', 'new delhi']);
const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function findDistricts(q, names) {
  const hits = [];
  const low = q.toLowerCase();
  for (const n of names) {
    const ln = n.toLowerCase();
    if (VAGUE.has(ln) && !low.includes(`${ln} district`)) continue;
    if (new RegExp(`\\b${escRe(ln)}\\b`).test(low) && !hits.includes(n)) hits.push(n);
  }
  // Common spellings that differ from the official names.
  const aliases = { ahmedabad: 'Ahmadabad', dahod: 'Dohad', kutch: 'Kachchh', mehsana: 'Mahesana', panchmahal: 'Panch Mahals', banaskantha: 'Banas Kantha', sabarkantha: 'Sabar Kantha', 'chhota udaipur': 'Chhotaudepur', aravalli: 'Arvalli', dangs: 'Dang', 'vav-tharad': 'Banas Kantha', 'vav tharad': 'Banas Kantha', bangalore: 'Bengaluru Urban', bengaluru: 'Bengaluru Urban', gurgaon: 'Gurugram', calcutta: 'Kolkata', bombay: 'Mumbai', madras: 'Chennai', trivandrum: 'Thiruvananthapuram', baroda: 'Vadodara', allahabad: 'Prayagraj', 'ahmednagar': 'Ahmednagar', 'aurangabad': 'Aurangabad' };
  for (const [a, n] of Object.entries(aliases)) if (new RegExp(`\\b${escRe(a)}\\b`).test(low) && names.includes(n) && !hits.includes(n)) hits.push(n);
  return hits;
}

function findState(q, states) {
  const low = q.toLowerCase();
  const sorted = [...states].sort((a, b) => b.length - a.length);
  for (const s of sorted) if (new RegExp(`\\b${escRe(s.toLowerCase())}\\b`).test(low)) return s;
  if (/\b(india|all india|country|nation(al)?)\b/.test(low)) return '';
  return null;
}

function pickMeasure(q) {
  const perPerson = PER_PERSON.test(q);
  if (/people per (kendra|store|generic)/.test(q)) return MEASURES.find((m) => m.id === 'people_per_kendra');
  if (/(health centres?|centers?|phc|chc).*per (kendra|store)/.test(q)) return MEASURES.find((m) => m.id === 'centres_per_kendra');
  for (const m of MEASURES) {
    if (m.onlyPer) continue;
    if (!m.words.some((w) => q.includes(w))) continue;
    if (m.perPerson === true && !perPerson) continue;
    if (m.perPerson === undefined && perPerson && MEASURES.some((x) => x.perPerson && x.words.some((w) => q.includes(w)))) continue;
    return m;
  }
  return null;
}

function howMany(q) {
  const m = q.match(/\b(top|first|best|worst|bottom)?\s*(\d{1,2})\b/);
  if (m) return Math.min(Number(m[2]), 50);
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  for (const [w, n] of Object.entries(words)) if (new RegExp(`\\b${w}\\b`).test(q)) return n;
  return 5;
}

// Returns a plan: { kind, ... } that the page turns into an answer.
// stateName: the state picked on the map (or null for all of India). A state
// named in the question wins; "in India" means all of India.
export function parseQuestion(question, districts, stateName = null) {
  const q = ` ${question.toLowerCase().replace(/[?!.]+/g, ' ').replace(/\s+/g, ' ')} `;
  const states = [...new Set(districts.map((d) => d.state).filter(Boolean))];
  const asked = findState(q, states);
  const scope = asked === null ? stateName : asked || null;
  const inScope = scope ? districts.filter((d) => d.state === scope) : districts;
  const outScope = districts.filter((d) => !inScope.includes(d));
  // A state's own name (Lakshadweep, Chandigarh) is not read as a district.
  const qNoState = asked ? q.replace(new RegExp(escRe(asked.toLowerCase()), 'g'), ' ') : q;
  let named = findDistricts(qNoState, [...new Set(inScope.map((d) => d.name))]);
  if (!named.length) named = findDistricts(qNoState, [...new Set(outScope.map((d) => d.name))]);

  // Medicine questions go to the medicine check.
  const med = q.match(/\b(price|cost|ceiling|alert|alerts|substandard|nsq|spurious|quality) (of|for) ([a-z0-9 .-]{3,40})/) || q.match(/\b(is|are) ([a-z0-9 .-]{3,40}) (safe|substandard|price controlled)/);
  if (med) return { kind: 'medicine', query: (med[3] || med[2]).trim() };

  if (/compare|versus| vs /.test(q) && named.length >= 2) return { kind: 'compare', districts: named.slice(0, 4) };

  if (/pincode/.test(q) && named.length) return { kind: 'pincodes', district: named[0] };

  const measure = pickMeasure(q);
  const fewest = /(fewest|least|lowest|smallest|minimum|worst served|poorly served|less|lack)/.test(q);
  const most = /(most|highest|largest|maximum|best served|\bmore\b)/.test(q);

  if (named.length === 1 && (/how many|what is|tell me|about|show|details/.test(q) || (!measure && !fewest && !most))) {
    return { kind: 'district', district: named[0], measure: measure?.id || null, state: scope };
  }
  if (measure || fewest || most || /rank|list|which district|where/.test(q)) {
    const m = measure || MEASURES[0];
    // For the gap score, "where is a store needed" means highest first.
    let order = 'desc';
    if (fewest) order = 'asc';
    if (most) order = 'desc';
    if (m.id === 'gap_score' && !fewest) order = 'desc';
    return { kind: 'rank', measure: m.id, label: m.label, order, n: howMany(q), state: scope };
  }
  if (named.length) return { kind: 'district', district: named[0], measure: null, state: scope };
  return { kind: 'unknown' };
}

export function rank(districts, measure, order, n, state = null) {
  const pool = state ? districts.filter((d) => d.state === state) : districts;
  const id = measure === 'gap_score' && state ? 'gap_score_state' : measure;
  return pool
    .map((d) => ({ name: d.name, lgd: d.lgd, state: d.state, v: value(d, id) }))
    .filter((x) => x.v != null)
    .sort((a, b) => (order === 'asc' ? a.v - b.v : b.v - a.v))
    .slice(0, n);
}

export const measureLabel = (id) => MEASURES.find((m) => m.id === id)?.label || id;
