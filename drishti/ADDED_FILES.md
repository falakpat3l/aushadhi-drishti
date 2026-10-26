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

