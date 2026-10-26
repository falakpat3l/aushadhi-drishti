# Data sources

Every source used by aushadhi-drishti is listed here. Status "planned" means it is chosen but not fetched yet. The build script fills in "Last fetched" each time it runs.

Rule for all rows: no personal data is stored or shown. Names and phone numbers of people are deleted at download time.

| Source | URL | Licence / terms | Coverage | Last update at source | How fetched | Status |
|---|---|---|---|---|---|---|
| Jan Aushadhi Kendras, district counts (Parliament annexure) | https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202626781301.pdf | Official public document; cite source | All India, 767 districts | 31 Dec 2025 | One PDF, parsed by script | planned |
| Jan Aushadhi Kendras, store list | https://janaushadhi.gov.in | No open licence stated; government public information. Robots rules and terms to be checked before first fetch | Store code, address, pincode, district (contact name and phone dropped) | To record | Weekly, slow, single thread | planned |
| OpenStreetMap pharmacies and hospitals | https://download.geofabrik.de/asia/india.html | ODbL 1.0; "© OpenStreetMap contributors"; share-alike on derived files | Volunteer mapped, incomplete | Daily extract | Weekly download in GitHub Actions, filtered by tags | planned |
| CDSCO NSQ and spurious drug alerts | https://cdsco.gov.in/opencms/opencms/en/Notifications/Alerts/ | Government website, no open licence; public regulatory notices, each linked | Monthly, batch level | Monthly | Weekly check for new PDFs | planned |
| NPPA ceiling prices | https://www.nppaindia.nic.in | Gazette notifications (public legal documents); cite S.O. number and date | Scheduled formulations under DPCO 2013 | Revised each April plus ad hoc orders | PDFs parsed once, new orders added weekly | planned |
| Brand to generic mapping | https://github.com/falakpat3l/anukalpa | DISB data CC BY 4.0 (C-DAC / NRCeS); brands.csv by Falak Patel | India brands and salts | On anukalpa rebuild | Read from the repo at build time | planned |
| District population, Census 2011 | https://censusindia.gov.in and https://data.gov.in | GODL-India (attribute provider; no endorsement) | All districts as of 2011 | 2011 (Census 2027 due after Mar 2027) | One-time CSV download | planned |
| District boundaries (LGD based) | https://bharatlas.com | Per layer licence (CC0 / CC BY 4.0 / GODL); to confirm for the chosen layer | Must include Vav-Tharad (Gujarat, 34 districts) | To record | One-time download | planned |
| Pincode boundaries | https://aikosh.indiaai.gov.in/home/datasets/details/all_india_pincode_boundary_geo_json.html | Open Government License, India | Delivery post office pincodes | To record | One-time download | planned |
| Geocoder | https://nominatim.openstreetmap.org | Nominatim usage policy: max 1 request a second, app name in requests, cache results | Only addresses that pincode matching cannot place | Live | Cached in repo, single thread | planned |
| Map tiles (background map) | https://tile.openstreetmap.org | OSM tile usage policy: light use, visible credit "© OpenStreetMap contributors", no bulk downloading | World | Live | Loaded by the visitor's browser, never stored | in use (Phase 1) |
| Fonts: Inter, JetBrains Mono | https://fonts.google.com | SIL Open Font License | n/a | n/a | Loaded by the visitor's browser | in use (Phase 1) |
| Map engine: CesiumJS | https://cesium.com/platform/cesiumjs/ | Apache 2.0. No Cesium ion account or token used | n/a | n/a | npm package | in use (Phase 1) |
| Map code base | https://github.com/bilawalsidhu/gods-eye-view | MIT (code only). Its bundled data is not used by this app | n/a | n/a | GitHub fork; original files kept unchanged outside drishti/ | in use (Phase 1) |

## Not used, and why

| Source | Reason |
|---|---|
| Gujarat XLN licence portal (xln.gujarat.gov.in) | Blocks automated access in its robots rules; no public list found |
| Google Maps and Google geocoding | Terms do not allow storing or reusing the data |
| Pharmarack, AIOCD AWACS | Private, paid data |
| DVDMS / e-Aushadhi dashboard | Login only, for government officials |
| TeleGeography cables and other gods-eye-view bundled data | Not used by this app (still present, unchanged, in the original God's Eye View folders); cable data is non-commercial |
