# Files added or changed in this fork

Nothing from God's Eye View has been deleted. Everything new is listed here, by phase.

## Phase 0
- Added `drishti/docs/PHASE0_RESEARCH.md`, `drishti/DATA_SOURCES.md`

## Phase 1
- Changed `README.md` (top of the repository): added a short aushadhi-drishti section at the top. The original README text below it is unchanged.
- Added `.github/workflows/drishti-pages.yml` (build, browser check, GitHub Pages)
- Added `drishti/README.md`, `drishti/GUIDE.md`, `drishti/CHANGELOG.md`, `drishti/ADDED_FILES.md`, `drishti/LICENSE`
- Added `drishti/.gitignore`, `drishti/.env.example`
- Added `drishti/package.json`, `drishti/package-lock.json`, `drishti/vite.config.js`, `drishti/index.html`
- Added `drishti/src/main.js`, `map.js`, `ui.js`, `credits.js`, `cesiumBase.js`, `style.css`, `layers/index.js`
- Added `drishti/public/logo.svg`, `drishti/scripts/copy-cesium.mjs`
- Added `drishti/tests/browser_check.py`, `drishti/docs/images/phone-360.png`, `drishti/docs/images/desktop-1280.png`
- Settings (no files): switched off the original God's Eye View CI workflow in the Actions tab, turned on GitHub Pages (source: GitHub Actions)

## Phase 2
- Changed `.github/workflows/drishti-pages.yml`: runs the data tests and the data build before building the site
- Added `drishti/pipeline/` (`build.py`, `config.py`, `fetch.py`, `geo.py`, `geocode.py`, `requirements.txt`, `sources/*.py`, `seeds/*.csv`, `seeds/README.md`)
- Added `drishti/src/data.js`, `metrics.js`, `details.js`, `layers/districts.js`, `layers/points.js`, `layers/pincodes.js`
- Changed `drishti/src/main.js`, `layers/index.js`, `index.html` styles in `style.css`
- Added `drishti/tests/test_pipeline.py`, `tests/phase_checks.py`, `tests/fixtures/overpass_sample.json`
- Changed `drishti/README.md`, `GUIDE.md`, `DATA_SOURCES.md`, `CHANGELOG.md`, `.gitignore`, `tests/browser_check.py`
- Added screenshots in `drishti/docs/images/`

## Phase 3
- Added `drishti/pipeline/insights.py`, `drishti/src/insights.js`, `drishti/docs/gap-score.md`
- Changed `drishti/pipeline/build.py`, `src/details.js`, `src/layers/index.js`, `src/layers/districts.js`
- Changed `drishti/tests/test_pipeline.py`, `tests/phase_checks.py`, `README.md`, `CHANGELOG.md`, screenshots

## Phase 4
- Added `drishti/pipeline/medicines.py`, `pipeline/places.py`, `pipeline/sources/cdsco.py`, `sources/nppa.py`, `sources/anukalpa.py`
- Added `drishti/src/medicine.js`; changed `src/layers/index.js`, `index.html`, `pipeline/build.py`
- Added `drishti/tests/fixtures/make_fixtures.py`, `cdsco_sample.pdf`, `nppa_sample.pdf`, `alerts_sample.json`, `medicines_sample.json`; changed `tests/test_pipeline.py`, `tests/phase_checks.py`
- Added `drishti/docs/permission-requests.md`, `drishti/docs/KNOWN_GAPS.md`; changed `drishti/DATA_SOURCES.md`, `README.md`, `CHANGELOG.md`, `src/style.css`

## Phase 5
- Added `drishti/src/ask.js`, `src/askRules.js`, `tests/ask.test.mjs`
- Changed `drishti/src/main.js`, `src/ui.js`, `src/style.css`, `vite.config.js` (local-only AI helper), `.env.example`, `tests/phase_checks.py`, `docs/KNOWN_GAPS.md`, `README.md`, `GUIDE.md`, `CHANGELOG.md`, `.github/workflows/drishti-pages.yml` (runs the ask-rule tests)

## Phase 6
- Changed `.github/workflows/drishti-pages.yml`: weekly schedule, manual refresh option, data notes artifact
- Added `drishti/docs/design-opt-in-stock-sharing.md`
- Changed `drishti/README.md`, `GUIDE.md`, `CHANGELOG.md`, `package.json`

## Phase 7
- Added `drishti/pipeline/basemap.py`, `drishti/public/basemap/india-basemap.json`, `drishti/src/layers/basemap.js`, `drishti/pipeline/seeds/district_merges.csv`, `drishti/tests/fixtures/osm_sample.osm`, `osm_sample.osm.pbf`
- Changed `drishti/pipeline/build.py`, `config.py`, `fetch.py`, `geo.py`, `insights.py`, `medicines.py`, `sources/jak.py`, `sources/osm.py`, `sources/health.py`, `sources/population.py`, `requirements.txt`, `seeds/jak_district_counts.csv`, `seeds/district_aliases.csv`, `seeds/README.md`
- Changed `drishti/src/map.js`, `layers/index.js`, `layers/districts.js`, `layers/pincodes.js`, `layers/points.js`, `insights.js`, `details.js`, `metrics.js`, `ask.js`, `askRules.js`
- Changed `drishti/tests/test_pipeline.py`, `tests/ask.test.mjs`, `tests/phase_checks.py`, screenshots
- Changed `drishti/README.md`, `DATA_SOURCES.md`, `GUIDE.md`, `CHANGELOG.md`, `docs/KNOWN_GAPS.md`, `docs/gap-score.md`, `.gitignore`, `package.json`
- Changed `.github/workflows/drishti-pages.yml` (installs osmium-tool)

## Phase 7 fixes
- Changed `drishti/pipeline/sources/cdsco.py`, `pipeline/insights.py`, `tests/test_pipeline.py`, `docs/gap-score.md`, `CHANGELOG.md`, `ADDED_FILES.md`

## Phase 8
- Added `drishti/src/theme.js`, `drishti/public/fonts/` (Noto Sans map glyphs)
- Rewrote `drishti/index.html`, `src/style.css`, `src/main.js`, `src/map.js`, `src/layers/index.js`, `layers/basemap.js`, `layers/districts.js`, `layers/pincodes.js`, `layers/points.js`; changed `src/medicine.js`, `src/ui.js`, `pipeline/build.py` (district label points)
- Changed `drishti/package.json`, `package-lock.json`: added maplibre-gl, removed cesium and the copy step. `drishti/scripts/copy-cesium.mjs` and `drishti/src/cesiumBase.js` are kept but no longer used.
- Changed `drishti/tests/phase_checks.py`, docs and screenshots

## Phase 8 polish
- Changed `drishti/index.html` (Coming soon section), `src/style.css`, `src/theme.js`, `src/insights.js`, `src/medicine.js`, `src/map.js`, `src/layers/index.js`, `layers/districts.js`, `layers/pincodes.js`, `tests/phase_checks.py`, `CHANGELOG.md`, screenshots

## Phase 8 views
- Added `drishti/src/layers/states.js`; changed `pipeline/build.py` (writes `states.geojson`), `index.html`, `src/style.css`, `src/ui.js`, `src/metrics.js`, `src/layers/index.js`, `layers/districts.js`, `tests/phase_checks.py`, `CHANGELOG.md`
