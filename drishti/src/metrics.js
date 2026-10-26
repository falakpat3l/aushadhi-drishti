// What the district colours can show. Each metric reads a district's
// properties (from districts.geojson) and returns a number, or null.
// `worse` says which end is the problem: 'high' or 'low'.
export const METRICS = [
  {
    id: 'pop2011',
    label: 'Population (Census 2011)',
    get: (p) => p.pop2011 || null,
    fmt: (v) => v.toLocaleString('en-IN'),
    worse: 'high',
    goodLabel: 'Fewer people',
    badLabel: 'More people',
  },
  {
    id: 'jak_official',
    label: 'Jan Aushadhi Kendras (official count)',
    get: (p) => p.jak_official,
    fmt: (v) => String(v),
    worse: 'low',
  },
  {
    id: 'osm_pharmacy',
    label: 'Pharmacies mapped in OpenStreetMap',
    get: (p) => p.osm_pharmacy,
    fmt: (v) => String(v),
    worse: 'low',
  },
  {
    id: 'gov_centres',
    label: 'Government health centres (PHC, CHC, hospitals)',
    get: (p) => (p.no_centre_data ? null : p.phc + p.chc + p.hospital_gov),
    fmt: (v) => String(v),
    worse: 'low',
  },
];

export function addMetrics(list) {
  for (const m of list) if (!METRICS.find((x) => x.id === m.id)) METRICS.push(m);
}

export const metricById = (id) => METRICS.find((m) => m.id === id);

// The headline and source line shown on the map for each measure
// (short, plain, in the style of a news chart).
const SRC_KENDRA = 'Sources: PIB (Kendras, 31 Dec 2025), Census 2011, NIC health centres';
const ABOUT = {
  gap_score: ['Where would a new generic store help most?', '0 = well served, 100 = most underserved', SRC_KENDRA],
  gap_score_state: ['Where would a new generic store help most?', '0 = well served, 100 = most underserved, within the state', SRC_KENDRA],
  people_per_kendra: ['How many people share one Jan Aushadhi Kendra?', 'People (2011) for every Kendra', 'Sources: PIB, Census 2011'],
  kendras_per_lakh: ['Jan Aushadhi Kendras for every 1 lakh people', 'Official count, 31 Dec 2025', 'Sources: PIB, Census 2011'],
  outlets_per_10k: ['Medicine outlets for every 10,000 people', 'Kendras plus pharmacies mapped in OpenStreetMap (a floor)', 'Sources: PIB, OpenStreetMap, Census 2011'],
  centres_per_kendra: ['Government health centres for every Kendra', 'More centres per Kendra: more prescriptions with nowhere to fill them', 'Sources: NIC HealthGIS, PIB'],
  pop2011: ['How many people live here?', 'Census 2011', 'Source: Census of India 2011'],
  jak_official: ['Jan Aushadhi Kendras', 'Official count, 31 Dec 2025', 'Source: PIB (Rajya Sabha answer)'],
  osm_pharmacy: ['Pharmacies mapped in OpenStreetMap', 'Volunteer mapped, so a floor, not a full count', 'Source: OpenStreetMap contributors'],
  gov_centres: ['Government health centres', 'Primary and community health centres and government hospitals', 'Source: NIC HealthGIS'],
};

export function aboutMetric(id) {
  const [title, sub, source] = ABOUT[id] || [metricById(id)?.label || id, '', ''];
  return { title, sub, source };
}
