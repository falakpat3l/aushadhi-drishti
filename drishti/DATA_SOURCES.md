# Data sources

Every source used by aushadhi-drishti is listed here.

- **Last fetched:** each build writes the date it fetched every source, and any problem, to `data/meta.json` on the live site: https://falakpat3l.github.io/aushadhi-drishti/data/meta.json
- **Rule for all rows:** no personal data is stored or shown. Names and phone numbers of people are never kept.

## In use

| Source | URL | Licence / terms | Coverage | Last update at source | How fetched | Since |
|---|---|---|---|---|---|---|
| District boundaries (Local Government Directory, LGD) | https://github.com/yashveeeeeeer/india-geodata (release `admin/districts`, file `LGD_Districts.parquet`) | Republished as CC0 by india-geodata; original data by LGD, Ministry of Panchayati Raj | All India; Gujarat has 33 districts in this file | File dated 2024 | Downloaded by the build from GitHub, cached | Phase 2 |
| Population, Census 2011, by sub-district | Same repository, release `census/2011`, file `SubDistricts_2011.parquet` | CC0 (republished); original data by the Census of India | All India, 2011 | 2011 | Downloaded by the build; sub-districts added up by today's LGD district code | Phase 2 |
| Pincode areas | Same repository, release `postal/boundaries`, file `Datagov_Pincode_Boundaries.parquet` | CC0 (republished); original from data.gov.in (GODL-India) | All India; 1,003 pincodes in Gujarat | File dated 2024 | Downloaded by the build | Phase 2 |
| Government health centres (PHC, CHC, sub-centres, hospitals) | Same repository, release `healthcare/facilities`, file `INDIA_HEALTH_FACILITIES_NIC.geojson`; original: NIC HealthGIS https://healthgis.in | India Open Government Licence (GODL-India) | All India; 9,409 in Gujarat | 2023 to 2026 | Downloaded by the build. Name and type of each centre kept | Phase 2 |
| Jan Aushadhi Kendras, district counts | https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202626781301.pdf (annexure to a Rajya Sabha answer) | Official public document; cited | All India by district (17,990 Kendras, 767 districts) | As on 31 Dec 2025 | Seed table `pipeline/seeds/jak_district_counts.csv` typed from the PDF; the build re-reads the PDF and replaces the table only if its rows add up to the stated total | Phase 2 |
| Pharmacies and hospitals in OpenStreetMap | https://overpass-api.de (Overpass API) | ODbL 1.0; "© OpenStreetMap contributors"; share-alike on our derived files | Gujarat; volunteer mapped, incomplete | Live | One query per state per build. Kept: position, kind, OSM id; hospital names. Pharmacy names are not kept | Phase 2 |
| Geocoder (only for store addresses without a usable pincode) | https://nominatim.openstreetmap.org | Nominatim usage policy: at most 1 request a second, app named in every request, results cached | n/a | Live | Cached between runs, single thread | Phase 2 |
| Map tiles (background map) | https://tile.openstreetmap.org | OSM tile usage policy: light use, visible credit, no bulk downloading | World | Live | Loaded by the visitor's browser, never stored | Phase 1 |
| Map engine: CesiumJS | https://cesium.com/platform/cesiumjs/ | Apache 2.0. No Cesium ion account or token used | n/a | n/a | npm package | Phase 1 |
| Fonts: Inter, JetBrains Mono | https://fonts.google.com | SIL Open Font License | n/a | n/a | Loaded by the visitor's browser | Phase 1 |
| Map code base | https://github.com/bilawalsidhu/gods-eye-view | MIT (code only). Its bundled data is not used by this app | n/a | n/a | GitHub fork; original files kept unchanged outside `drishti/` | Phase 1 |

## Planned

| Source | URL | Licence / terms | Note |
|---|---|---|---|
| Jan Aushadhi store list (store code, address, pincode) | https://janaushadhi.gov.in | No open licence stated; government public information | Only if the site's robots rules and terms allow it. Contact names and phones are never kept |
| CDSCO not-of-standard-quality and spurious drug alerts | https://cdsco.gov.in/opencms/opencms/en/Notifications/Alerts/ | Government website, no open licence; public regulatory notices, each linked | Phase 4 |
| NPPA ceiling prices | https://www.nppaindia.nic.in | Gazette notifications; cite S.O. number and date | Phase 4 |
| Brand to generic mapping | https://github.com/falakpat3l/anukalpa | DISB data CC BY 4.0 (C-DAC / NRCeS); brands.csv by Falak Patel | Phase 4 |

## Not used, and why

| Source | Reason |
|---|---|
| Gujarat XLN licence portal (xln.gujarat.gov.in) | Blocks automated access in its robots rules; no public list found. Licensed outlets in Gujarat can only be described with published state totals |
| Google Maps and Google geocoding | Terms do not allow storing or reusing the data |
| Pharmarack, AIOCD AWACS | Private, paid data |
| DVDMS / e-Aushadhi dashboard | Login only, for government officials |
| TeleGeography cables and other God's Eye View bundled data | Not used by this app (still present, unchanged, in the original folders); cable data is non-commercial |

## Known limits

- **Vav-Tharad** (Gujarat's 34th district, formed 2025) has no open boundary yet. Its 4 Kendras are counted inside Banas Kantha, and the map says so.
- **Population is from 2011.** Census 2027 counts people in February 2027; the numbers will be swapped when published.
- **OpenStreetMap** misses many shops, so pharmacy counts from it are a floor, not a full count.
