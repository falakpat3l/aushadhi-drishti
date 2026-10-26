# Known gaps

Honest list of what the map does not do yet, and why. Updated each phase.

## Data

1. **Jan Aushadhi store points.** Only official district counts are on the map. janaushadhi.gov.in has a store list, but its copyright policy asks for permission by email before reuse, and the list includes owner names. A permission request is drafted in `docs/permission-requests.md`. Until a yes arrives, Kendras appear as district totals, and OpenStreetMap shops named "Jan Aushadhi" are flagged.
2. **Licensed pharmacies (drug licence registers).** Gujarat's licensing portal (XLN) blocks automated access and has no public list, so licensed outlets per district are not shown. Other states vary; none is used yet.
3. **Vav-Tharad.** Formed in 2025, no open boundary yet. Its 4 Kendras are counted inside Banas Kantha.
4. **Population is from 2011.** Census 2027 counts people in February 2027. Fast-growing districts look better served than they are.
5. **OpenStreetMap is incomplete.** Pharmacy counts from OSM (read weekly from Geofabrik's India extract) are a floor. When there is no OSM data, the gap score drops that signal and says so.
6. **CDSCO alerts are counts only.** CDSCO's copyright policy does not allow its lists to be reproduced without permission, so the map shows how many samples per month, per district or reporting state, and per generic name, with links to the official lists. Product, batch and maker details stay on CDSCO's site.
7. **CDSCO alerts after July 2025** moved to a new portal (cdscoonline.gov.in) with no download or open data feed. They are not read until CDSCO gives permission (request drafted).
8. **NPPA price list.** The parser is ready, but the NPPA site could not be reached from our test machines and the official consolidated list URL is not confirmed, so the medicine check may say "price list not loaded".
9. **Alert places are rough.** A maker's printed address is turned into a district (never a street or a pincode dot), and spurious samples are placed only at the state that reported them.
10. **Health centres missing for 11 states and UTs.** The NIC file has no centres for Arunachal Pradesh, Chandigarh, Delhi, Himachal Pradesh, Jammu and Kashmir, Ladakh, Manipur, Meghalaya, Mizoram, Nagaland and Sikkim. There the gap score uses people per Kendra only, and the map says so.
11. **New districts without boundaries.** Vav-Tharad (Gujarat, 2025) and Maihar, Mauganj and Pandhurna (Madhya Pradesh, 2023) have no open boundary yet, so their Kendras are counted in the parent district. Nine Rajasthan districts formed in 2023 and merged back in Dec 2024 are drawn inside their parent districts.
12. **2011 population for districts formed later** is rebuilt from 2011 sub-districts. Where a sub-district was split, its people are shared by area; those districts say "partly estimated".
13. **Pakistan-occupied areas** of Jammu and Kashmir and Ladakh are shown as part of India, as on the Survey of India map. There is no Census or Kendra data for them, so they have no score.
14. **Districts not in the Kendra table** (for example some new districts in Nagaland and Assam) show 0 Kendras with a note: either none yet, or counted under a neighbouring district.

## Map

1. The map is flat (no globe), with north always up.
2. There is no street map underneath, by design: free street-map tiles draw India's borders the international way. The background shows India's official outline, state lines, neighbours and main city names only.
3. Dots (pharmacies, hospitals, health centres) and pincode areas load one state at a time, to keep phones fast. Pick a state to see them.

## Ask the map

1. Rules understand the common question shapes (rank, one district, compare, pincodes, medicine price). Other questions get example suggestions.
2. The AI helper works only on your own computer with `npm run dev`; the live site has none, by design (no keys in a public page).
