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
    get: (p) => p.phc + p.chc + p.hospital_gov,
    fmt: (v) => String(v),
    worse: 'low',
  },
];

export function addMetrics(list) {
  for (const m of list) if (!METRICS.find((x) => x.id === m.id)) METRICS.push(m);
}

export const metricById = (id) => METRICS.find((m) => m.id === id);
