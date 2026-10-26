# Data sources

Every source used by aushadhi-drishti is listed here.

- **Last fetched:** each build writes the date it fetched every source, and any problem, to `data/meta.json` on the live site: https://falakpat3l.github.io/aushadhi-drishti/data/meta.json
- **Rule for all rows:** no personal data is stored or shown. Names and phone numbers of people are never kept.

## In use

| Source | URL | Licence / terms | Coverage | Last update at source | How fetched | Since |
|---|---|---|---|---|---|---|
| District boundaries (Local Government Directory, LGD) | https://github.com/yashveeeeeeer/india-geodata (release `admin/districts`, file `LGD_Districts.parquet`) | Republished as CC0 by india-geodata; original data by LGD, Ministry of Panchayati Raj | All India: 785 districts in the file, drawn as the Survey of India does (all of Jammu and Kashmir, Ladakh and Arunachal Pradesh). Nine Rajasthan districts merged back in Dec 2024 are drawn inside their parents, giving 776 | File dated 2024 | Downloaded by the build from GitHub, cached | Phase 2 (all India: Phase 7) |
| Population, Census 2011, by sub-district | Same repository, release `census/2011`, file `SubDistricts_2011.parquet` | CC0 (republished); original data by the Census of India | All India, 2011 | 2011 | Downloaded by the build. Each 2011 sub-district is placed in today's district by its shape; split sub-districts are shared by area (marked "partly estimated") | Phase 2 |
| Pincode areas | Same repository, release `postal/boundaries`, file `Datagov_Pincode_Boundaries.parquet` | CC0 (republished); original from data.gov.in (GODL-India) | All India: 19,312 pincode areas, served one state at a time | File dated 2024 | Downloaded by the build | Phase 2 |
| Government health centres (PHC, CHC, sub-centres, hospitals) | Same repository, release `healthcare/facilities`, file `INDIA_HEALTH_FACILITIES_NIC.geojson`; original: NIC HealthGIS https://healthgis.in | India Open Government Licence (GODL-India) | 25 states and UTs (148,000 centres incl. sub-centres). None in the file for Arunachal Pradesh, Chandigarh, Delhi, Himachal Pradesh, Jammu and Kashmir, Ladakh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim | 2023 to 2026 | Downloaded by the build. Name and type of each centre kept | Phase 2 |
| Jan Aushadhi Kendras, district counts | https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202626781301.pdf (annexure to a Rajya Sabha answer) | Official public document; cited | All India by district (17,990 Kendras, 767 districts) | As on 31 Dec 2025 | Seed table `pipeline/seeds/jak_district_counts.csv` (all 767 rows) read from the PDF and checked against its total; the build re-reads the PDF and replaces the table only if its rows add up to the stated total | Phase 2 |
| Pharmacies and hospitals in OpenStreetMap | https://download.geofabrik.de/asia/india.html (Geofabrik's free India extract) | ODbL 1.0; "© OpenStreetMap contributors"; share-alike on our derived files | All India; volunteer mapped, incomplete | Daily at source | Downloaded once a week (Monday refresh), cut down with the free osmium-tool, then the big file is deleted. Kept: position, kind, OSM id; hospital names. Pharmacy names are not kept. (Overpass was dropped: its robots rules turn away automated jobs) | Phase 7 |
| Geocoder (only for store addresses without a usable pincode) | https://nominatim.openstreetmap.org | Nominatim usage policy: at most 1 request a second, app named in every request, results cached | n/a | Live | Cached between runs, single thread | Phase 2 |
| CDSCO not-of-standard-quality and spurious drug alerts (monthly lists, up to July 2025) | https://cdsco.gov.in/opencms/opencms/en/Notifications/Alerts/ | Government website. Its copyright policy says its content may not be reproduced, in part or in full, without permission. So the site publishes **counts only** (per month, per district or reporting state, per generic name), never product, batch, maker or result text, and every count links to the official CDSCO list | All India, monthly; last 36 months kept | Monthly | Alerts page read weekly; each monthly PDF downloaded once (2 seconds apart), read to count rows, and kept only in the private build cache | Phase 4 |
| Brand to generic mapping | https://github.com/falakpat3l/anukalpa (`docs/data/IN.json`) | India list: C-DAC / NRCeS Drug Information Service Bundle, CC BY 4.0, plus brands.csv by Falak Patel | About 93,000 Indian brands | When anukalpa is rebuilt | Downloaded weekly from GitHub; copied to the site for the medicine search | Phase 4 |
| India's outline (background map) | Survey of India boundary, via https://github.com/datameet/maps and india-geodata (`data/survey-of-india/india-boundary`) | CC BY 4.0 | India as the Government of India shows it | 2024 | `pipeline/basemap.py`, output committed in `public/basemap/` | Phase 7 |
| Neighbouring countries, city names | Natural Earth, India point of view (`ne_10m_admin_0_countries_ind`, `ne_50m_populated_places_simple`), via https://github.com/nvkelso/natural-earth-vector | Public domain | Region around India; India's Survey of India outline is cut out of every neighbour | v5.1 | `pipeline/basemap.py` | Phase 7 |
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

- **New districts without boundaries:** Vav-Tharad (Gujarat), Maihar, Mauganj, Pandhurna (Madhya Pradesh). Their Kendras are counted in the parent district, and the map says so.
- **No street-map tiles:** the common free tiles draw India's borders the international way, so the background map is drawn from the Survey of India outline instead.
- **Population is from 2011.** Census 2027 counts people in February 2027; the numbers will be swapped when published.
- **OpenStreetMap** misses many shops, so pharmacy counts from it are a floor, not a full count.
- **Not legal advice.** The licence notes above are our reading of each site's published terms. Ask the source when in doubt.
