# How the code works

A short tour, in plain words. Two halves: a **data build** (Python) that makes small files, and a **web page** (JavaScript) that draws them.

## 1. The data build (`pipeline/`)

Run `python3 pipeline/build.py`. It does this, top to bottom:

1. **Download** the open files (district shapes, 2011 population, pincodes, health centres) into `pipeline/.cache/`. See `fetch.py`: it names the project in every request and checks each site's robots.txt rules.
2. **Districts** (`geo.py`): reads every district of India. Nine Rajasthan districts merged back in 2024 are folded into their parents (`seeds/district_merges.csv`).
3. **Population** (`sources/population.py`): places each 2011 sub-district inside today's district by its shape.
4. **Jan Aushadhi Kendras** (`sources/jak.py`): reads the official count table (`seeds/jak_district_counts.csv`) and matches names to districts. Spellings that differ are listed in `seeds/district_aliases.csv`.
5. **Health centres** (`sources/health.py`) and **OpenStreetMap** pharmacies and hospitals (`sources/osm.py`): each dot is placed in its district and pincode by position. Pharmacy names are never kept.
6. **Gap score** (`insights.py`): turns each measure into a rank from 0 to 100 and mixes them (explained in `docs/gap-score.md`).
7. **Medicines** (`medicines.py`): CDSCO alert counts, NPPA prices, and the brand list from anukalpa.
8. **Write** small files to `public/data/`: `districts.geojson`, `states.geojson`, one folder per state (`states/<state>/points.json`, `pincodes.geojson`), and `meta.json` (which sources worked).

The background map of India (`public/basemap/`) is made once by `pipeline/basemap.py` from the Survey of India outline.

## 2. The web page (`index.html` and `src/`)

| File | What it does |
|---|---|
| `src/main.js` | Starts everything: theme, panel, map, layers, ask box |
| `src/map.js` | Creates the flat map (MapLibre), sets zoom limits and gestures, fits views |
| `src/theme.js` | Light and dark mode, and every map colour for each |
| `src/ui.js` | Opens and closes the panel; shows details and answers |
| `src/layers/basemap.js` | Draws India, state lines, neighbours and place names |
| `src/layers/states.js` | State shapes and their colours |
| `src/layers/districts.js` | District shapes, their colours, and the legend |
| `src/layers/pincodes.js` | Pincode shapes, one state at a time |
| `src/layers/points.js` | Dots: health centres, hospitals, pharmacies |
| `src/layers/index.js` | Wires it together: the panel, picking a state, taps on the map, the title card |
| `src/metrics.js`, `src/insights.js` | The list of measures you can colour by, with their headline and source |
| `src/details.js` | The table shown when you open a district or pincode |
| `src/medicine.js` | The medicine check and the drug alert layer |
| `src/ask.js`, `src/askRules.js` | The "Ask" box: plain questions answered by simple rules |
| `src/style.css` | All the looks |

Not used any more (kept so nothing is deleted): `src/cesiumBase.js`, `scripts/copy-cesium.mjs`.

## 3. Colours

Green means well served, red means underserved, grey means no data. Classes are fifths: each colour holds about the same number of areas (`classBreaks` in `layers/districts.js`).

## 4. Tests (`tests/`)

- `test_pipeline.py`: the data build, offline, including a check that India's outline is the official one.
- `ask.test.mjs`: the Ask rules.
- `browser_check.py` and `phase_checks.py`: open the page at phone and laptop size, click through, and fail on any error.

## 5. Publishing

`.github/workflows/drishti-pages.yml` runs the tests, builds the data and the page, and publishes to GitHub Pages on every push and every Monday.
