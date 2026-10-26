# Guide

Plain steps. Run each Terminal command one at a time, from the `drishti` folder.

## Run the map on your Mac

1. Install Node.js 22 or newer (free): https://nodejs.org
2. Open Terminal and go to the folder:
   `cd ~/Claude2/aushadhi-drishti/drishti`
3. Install the parts (first time only):
   `npm install`
4. Start the map:
   `npm run dev`
5. Open the address it prints (it ends in `/aushadhi-drishti/`).

## Check it like the robot does

1. Build the site: `npm run build`
2. Install the test browser (first time only):
   `pip3 install playwright` then `python3 -m playwright install chromium`
3. Run the check: `python3 tests/browser_check.py`

It opens the map at phone size (360 px) and laptop size (1280 px), fails on any console error, and saves screenshots to `docs/images/`.

## Put it online

GitHub Pages builds the site by itself after each push (see `.github/workflows/drishti-pages.yml` at the top of the repository).
