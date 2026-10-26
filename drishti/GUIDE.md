# Guide

Plain steps. Run each Terminal command one at a time, from the `drishti` folder.

## Run the map on your Mac

1. Install Node.js 22 or newer (free): https://nodejs.org
2. Open Terminal and go to the folder:
   `cd ~/Claude2/aushadhi-drishti/drishti`
3. Install the parts (first time only):
   `npm install`
4. Build the map data for all of India (needs internet, takes a few minutes the first time):
   `pip3 install -r pipeline/requirements.txt`
   then `python3 pipeline/build.py`
5. Start the map:
   `npm run dev`
6. Open the address it prints (it ends in `/aushadhi-drishti/`).

## Check it like the robot does

1. Build the site: `npm run build`
2. Install the test browser (first time only):
   `pip3 install playwright` then `python3 -m playwright install chromium`
3. Run the data tests (no internet needed): `python3 -m unittest discover tests`
4. Run the browser check: `python3 tests/browser_check.py`

It opens the map at phone size (360 px) and laptop size (1280 px), fails on any console error, and saves screenshots to `docs/images/`.

## Put it online

GitHub Pages builds the site by itself after each push (see `.github/workflows/drishti-pages.yml` at the top of the repository).

## OpenStreetMap pharmacies on your Mac (optional)

1. Install osmium-tool (free): `brew install osmium-tool`
2. Run `python3 pipeline/build.py --refresh` (downloads the India file, about 1.5 GB, then deletes it)

Without osmium-tool the build still works; it uses the last copy, or shows no OSM dots.

## Remake the map of India

Only needed if the official boundary changes: `pip3 install pyshp pyproj` then `python3 pipeline/basemap.py`. Commit the new `public/basemap/india-basemap.json`.

## Where the numbers come from

Run `python3 pipeline/build.py`. It prints one line per source: `[ok]` or `[GAP]` with the reason. A source that fails never stops the build; the map shows what it has and `public/data/meta.json` records the gap.

## Ask the map with a local AI (optional, free)

The live site answers questions with built-in rules only. On your own Mac you can add an AI helper for questions the rules cannot read:

1. Install Ollama (free): https://ollama.com
2. In Terminal: `ollama pull llama3.2`
3. Copy `.env.example` to `.env` and set `ASK_AI_PROVIDER=ollama`
4. Run `npm run dev`

`.env` is never committed (it is in `.gitignore`).

## Weekly refresh

Every Monday at 07:53 India time, GitHub Actions re-fetches every source, rebuilds and republishes the map. To refresh now: GitHub, Actions tab, "drishti pages", Run workflow, tick "Re-fetch every source now". The run's "data-meta" download shows which sources worked.
