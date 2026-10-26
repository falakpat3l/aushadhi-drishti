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
| CDSCO not-of-standard-quality and spurious drug alerts (monthly lists, up to July 2025) | https://cdsco.gov.in/opencms/opencms/en/Notifications/Alerts/ | Government website. Its copyright policy says its content may not be reproduced, in part or in full, without permission. So the site publishes **counts only** (per month, per district or reporting state, per generic name), never product, batch, maker or result text, and every count links to the official CDSCO list | All India, monthly; last 36 months kept | Monthly | Alerts page read weekly; each monthly PDF downloaded once (2 seconds apart), read to count rows, and kept only in the private build cache | Phase 4 |
| Brand to generic mapping | https://github.com/falakpat3l/anukalpa (`docs/data/IN.json`) | India list: C-DAC / NRCeS Drug Information Service Bundle, CC BY 4.0, plus brands.csv by Falak Patel | About 93,000 Indian brands | When anukalpa is rebuilt | Downloaded weekly from GitHub; copied to the site for the medicine search | Phase 4 |
| Map tiles (background map) | https://tile.openstreetmap.org | OSM tile usage policy: light use, visible credit, no bulk downloading | World | Live | Loaded by the visitor's browser, never stored | Phase 1 |
| Map engine: CesiumJS | https://cesium.com/platform/cesiumjs/ | Apache 2.0. No Cesium ion account or token used | n/a | n/a | npm package | Phase 1 |
| Fonts: Inter, JetBrains Mono | https://fonts.google.com | SIL Open Font License | n/a | n/a | Loaded by the visitor's browser | Phase 1 |
| Map code base | https://github.com/bilawalsidhu/gods-eye-view | MIT (code only). Its bundled data is not used by this app | n/a | n/a | GitHub fork; original files kept unchanged outside `drishti/` | Phase 1 |

## Planned

| Source | URL | Licence / terms | Note |
|---|---|---|---|
| Jan Aushadhi store list (store code, address, pincode) | https://janaushadhi.gov.in | Its copyright policy asks for permission by email before its material is reproduced. The list also holds owner names, which are personal data and would never be kept | Waiting for permission; request drafted in `docs/permission-requests.md`. Until then only official district counts are used |
| CDSCO public NSQ portal (alerts from Aug 2025 on) | https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug | Same CDSCO copyright policy as above | Monthly lists moved here in Aug 2025 (330 rows shown for one month in Oct 2026). The site has no download or open data feed, so it is not read automatically. Only counts would ever be used; permission request drafted in `docs/permission-requests.md` |
| NPPA ceiling prices | https://www.nppaindia.nic.in | Price orders are published in the Gazette of India; Indian copyright law (Copyright Act 1957, section 52(1)(q)) allows reproducing Gazette matter. Cite S.O. number and date (latest yearly revision: S.O. 1581(E), 25 Mar 2026, in force 1 Apr 2026) | Parser ready (`pipeline/sources/nppa.py`). The NPPA site could not be reached from our test machines in Oct 2026, so the consolidated list URL is still to be confirmed |

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
- **Not legal advice.** The licence notes above are our reading of each site's published terms. Ask the source when in doubt.
