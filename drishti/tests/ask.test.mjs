// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestion, rank } from '../src/askRules.js';

const D = [
  { name: 'Bharuch', pop2011: 1551019, jak_official: 14, kendras_per_lakh: 0.9, osm_pharmacy: 40, outlets_per_10k: 0.3, phc: 39, chc: 8, hospital_gov: 0, gap_score: 65, people_per_kendra: 110787 },
  { name: 'Dohad', pop2011: 2127086, jak_official: 6, kendras_per_lakh: 0.28, osm_pharmacy: 5, outlets_per_10k: 0.05, phc: 80, chc: 10, hospital_gov: 0, gap_score: 100, people_per_kendra: 354514 },
  { name: 'Rajkot', pop2011: 2729679, jak_official: 101, kendras_per_lakh: 3.7, osm_pharmacy: 200, outlets_per_10k: 1.1, phc: 50, chc: 10, hospital_gov: 1, gap_score: 2, people_per_kendra: 27027 },
  { name: 'Ahmadabad', pop2011: 7045313, jak_official: 117, kendras_per_lakh: 1.66, osm_pharmacy: 900, outlets_per_10k: 1.4, phc: 40, chc: 10, hospital_gov: 2, gap_score: 12, people_per_kendra: 60216 },
];

test('fewest generic stores per person', () => {
  const p = parseQuestion('districts in Gujarat with the fewest generic stores per person', D);
  assert.equal(p.kind, 'rank');
  assert.equal(p.measure, 'kendras_per_lakh');
  assert.equal(p.order, 'asc');
  assert.equal(rank(D, p.measure, p.order, p.n)[0].name, 'Dohad');
});

test('most Jan Aushadhi Kendras (raw count)', () => {
  const p = parseQuestion('Which districts have the most Jan Aushadhi Kendras?', D);
  assert.equal(p.measure, 'jak_official');
  assert.equal(rank(D, p.measure, p.order, 3)[0].name, 'Ahmadabad');
});

test('where is a new store needed', () => {
  const p = parseQuestion('Where is a new generic store most needed?', D);
  assert.equal(p.measure, 'gap_score');
  assert.equal(rank(D, p.measure, p.order, p.n)[0].name, 'Dohad');
});

test('top 3 by pharmacies per 10,000', () => {
  const p = parseQuestion('top 3 districts with fewest pharmacies per 10,000 people', D);
  assert.equal(p.measure, 'outlets_per_10k');
  assert.equal(p.n, 3);
  assert.equal(p.order, 'asc');
});

test('one district', () => {
  const p = parseQuestion('Tell me about Bharuch', D);
  assert.deepEqual([p.kind, p.district], ['district', 'Bharuch']);
  assert.equal(parseQuestion('how many kendras in Ahmedabad', D).district, 'Ahmadabad');
});

test('compare and pincodes', () => {
  assert.deepEqual(parseQuestion('compare Bharuch and Rajkot', D).districts, ['Bharuch', 'Rajkot']);
  assert.equal(parseQuestion('which pincodes in Bharuch need a store', D).kind, 'pincodes');
});

test('medicine questions', () => {
  const p = parseQuestion('What is the price of paracetamol 650?', D);
  assert.equal(p.kind, 'medicine');
  assert.match(p.query, /paracetamol/);
});

test('unknown', () => {
  assert.equal(parseQuestion('hello there', D).kind, 'unknown');
});

test('states and all of India', () => {
  const X = [
    ...D.map((d) => ({ ...d, state: 'Gujarat' })),
    { name: 'Aurangabad', state: 'Bihar', pop2011: 2540073, jak_official: 14, kendras_per_lakh: 0.55, phc: 1, chc: 1, hospital_gov: 0, gap_score: 90, gap_score_state: 40 },
    { name: 'Aurangabad', state: 'Maharashtra', pop2011: 3701282, jak_official: 14, kendras_per_lakh: 0.38, phc: 1, chc: 1, hospital_gov: 0, gap_score: 95, gap_score_state: 70 },
    { name: 'North', state: 'Delhi', pop2011: 887978, jak_official: 59, kendras_per_lakh: 6.6, phc: 0, chc: 0, hospital_gov: 0, gap_score: 1, no_centre_data: true },
  ];
  const p = parseQuestion('districts in Bihar with the fewest kendras per lakh people', X);
  assert.equal(p.state, 'Bihar');
  assert.equal(rank(X, p.measure, p.order, 5, p.state).length, 1);
  assert.equal(parseQuestion('where in India is a new store needed', X, 'Gujarat').state, null);
  assert.equal(parseQuestion('where is a new store needed', X, 'Gujarat').state, 'Gujarat');
  assert.equal(parseQuestion('which district in the north east has the most kendras', X).kind, 'rank');
  assert.equal(parseQuestion('tell me about Aurangabad in Maharashtra', X).state, 'Maharashtra');
  assert.equal(rank(X, 'gov_centres', 'desc', 10).some((r) => r.name === 'North'), false);
});
