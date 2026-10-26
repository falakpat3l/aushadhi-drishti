# Known gaps

Honest list of what the map does not do yet, and why. Updated each phase.

## Data

1. **Jan Aushadhi store points.** Only official district counts are on the map. janaushadhi.gov.in has a store list, but its copyright policy asks for permission by email before reuse, and the list includes owner names. A permission request is drafted in `docs/permission-requests.md`. Until a yes arrives, Kendras appear as district totals, and OpenStreetMap shops named "Jan Aushadhi" are flagged.
2. **Licensed pharmacies (drug licence registers).** Gujarat's licensing portal (XLN) blocks automated access and has no public list, so licensed outlets per district are not shown. Other states vary; none is used yet.
3. **Vav-Tharad.** Formed in 2025, no open boundary yet. Its 4 Kendras are counted inside Banas Kantha.
4. **Population is from 2011.** Census 2027 counts people in February 2027. Fast-growing districts look better served than they are.
5. **OpenStreetMap is incomplete.** Pharmacy counts from OSM are a floor. When OSM cannot be reached, the gap score drops that signal and says so.
6. **CDSCO alerts are counts only.** CDSCO's copyright policy does not allow its lists to be reproduced without permission, so the map shows how many samples per month, per district or reporting state, and per generic name, with links to the official lists. Product, batch and maker details stay on CDSCO's site.
7. **CDSCO alerts after July 2025** moved to a new portal (cdscoonline.gov.in) with no download or open data feed. They are not read until CDSCO gives permission (request drafted).
8. **NPPA price list.** The parser is ready, but the NPPA site could not be reached from our test machines and the official consolidated list URL is not confirmed, so the medicine check may say "price list not loaded".
9. **Alert places are rough.** A maker's printed address is turned into a district (never a street or a pincode dot), and spurious samples are placed only at the state that reported them.
10. **Only Gujarat** is built so far. Other states need their entries in `pipeline/config.py` and `pipeline/seeds/district_aliases.csv`.

## Map

1. On phones the map opens flat (2D) to stay fast; laptops get the 3D globe.
2. Background tiles come from the public OpenStreetMap tile server, which is meant for light use. If the site becomes popular, switch to a self-hosted or free-tier tile service.

