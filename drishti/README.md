# aushadhi-drishti

An open, map-based "god's-eye view" of India's pharmacy supply side, built only from legally public data.

*aushadhi* means medicine and *drishti* means sight.

- Live map: https://falakpat3l.github.io/aushadhi-drishti/
- Started with Gujarat. Bharuch is the test district.

## Credit

This project is a fork of [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) by **Bilawal Sidhu** (MIT licence). It uses the same map engine (CesiumJS) and the same idea: one map that brings public signals together. The original code is kept, unchanged, in the rest of this repository. This app lives only in the `drishti/` folder. See `LICENSE` for both copyright lines.

## Rules this project follows

1. Open data only. Every source is listed in [DATA_SOURCES.md](DATA_SOURCES.md) with its licence.
2. No personal data. No names or phone numbers of people. Nothing about one pharmacist's or one business's sales, stock or shipments.
3. Areas are shown as totals by district or pincode. Public outlets (Jan Aushadhi Kendras, OpenStreetMap pharmacies, government health centres) may show as single dots, with no personal details.
4. No scraping that breaks a site's terms. No Google Maps data.
5. Free tools only. Any key lives in a `.env` file that is never committed.
6. Information only. Not for treatment decisions.

## Status

| Phase | What | State |
|---|---|---|
| 0 | Research report: [docs/PHASE0_RESEARCH.md](docs/PHASE0_RESEARCH.md) | Done |
| 1 | Fork, keep credit, centre on India, static site for GitHub Pages | Done |
| 2 | Base layers for Gujarat: districts, population, Jan Aushadhi Kendras, health centres, OSM pharmacies and hospitals, pincode totals | Done |
| 3 | Insights and gap score | Next |
| 4 | Drug quality alerts and price caps | |
| 5 | Ask the map | |
| 6 | Weekly refresh | |

## Folder map

```
drishti/
  index.html            the page
  src/                  map code (CesiumJS, plain JavaScript)
    main.js             starts everything
    map.js              the map: no API keys, OpenStreetMap tiles
    ui.js               side panel and phone bottom sheet
    credits.js          attribution line, always visible
    layers/             one file per map layer
  public/               files served as they are (logo, built data)
  pipeline/             data build (Python): download, clean, place, write
    build.py            run this to make public/data/
    config.py           states, URLs, map detail
    fetch.py            polite downloads (robots.txt, one name, cache)
    geo.py              boundaries, which-district-is-this-point
    geocode.py          address to position (pincode first, then Nominatim)
    sources/            one file per data source
    seeds/              small hand-checked tables (with their sources)
  scripts/              small helper scripts for the build
  tests/                offline data tests and the headless browser check
  docs/                 research report, screenshots
  DATA_SOURCES.md       every data source, licence and fetch method
  ADDED_FILES.md        every file added or changed in this fork
  GUIDE.md              how to run it, in plain steps
```

## Run it on your computer

See [GUIDE.md](GUIDE.md).
