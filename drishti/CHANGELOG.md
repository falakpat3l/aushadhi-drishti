# Changelog

## 0.11.0
- Australia: 8 states and territories, ABS estimated resident population and ages, OpenStreetMap pharmacies.
- Europe: NUTS 2 regions (2024), Eurostat population and share aged 65+, and people per pharmacist by country.

## 0.10.0 (Phase 9)
- Country switch: India, Singapore, New Zealand. Other countries show regions coloured by an access score (people per pharmacy 60%, share aged 65 and over 40%), pharmacy dots, a ranking and details.
- Singapore: 55 planning areas, HSA retail pharmacies, SingStat residents (June 2026). New Zealand: 16 regions, Census 2023 population, OpenStreetMap pharmacies.

## 0.9.0
- Title card on the map, in the style of a news chart: where you are, a plain headline, one line of context. Each legend ends with its source.
- Fixed: the legend could show district colours while states or pincodes were on screen. Pincodes now have their own legend.
- Phones: smaller title card and bottom sheet, so more of the map shows.
- New `docs/HOW_THE_CODE_WORKS.md`: a plain tour of the code.
- Synced with 57 new God's Eye View commits from upstream (outside `drishti/`).

## 0.8.2
- Show by States, Districts or Pincodes. States get the same measures added up from their districts and a gap score among states.
- Menu button (three lines) instead of the word Panel; the panel is open by default.
- Top and bottom bars use the opposite shade (dark in light mode, light in dark mode) for contrast; teal and saffron accents.
- Legend reads Well served, Underserved, No data.

## 0.8.1
- Calmer panel: only switches that work right now are shown; everything not available yet is listed once under "Coming soon" at the bottom.
- Colours mean the same everywhere: green is better, red is worse, grey is no data. The legend says so.
- More space and rounded corners; the panel floats over the map on laptops and is a rounded bottom sheet on phones.

## 0.8.0 (Phase 8)
- Flat map of India with MapLibre GL instead of the CesiumJS globe: sharp on Retina and phone screens, pinch, trackpad, scroll and double-tap zoom; north stays up.
- Tap a state on the map to open it (same as picking it from the list); inside a state, tap a district for its details. A path at the top left (India / state / district) goes back.
- New look in the style of falakpatel.com: serif text, link blue, thin rules, light and dark mode (remembered on the device), monospace labels and numbers from God's Eye View.
- Map labels drawn sharp with Noto Sans; district names appear when you zoom in.

## 0.7.1
- CDSCO alerts reader fixed: the live page writes its links with single quotes, which the reader missed.
- OpenStreetMap pharmacies are shown but no longer scored: about 9,000 are mapped for all of India, too few to compare districts fairly.

## 0.7.0 (Phase 7)
- All of India: 776 districts, all 767 rows of the official Kendra table (17,990 Kendras), 2011 population for every district (new districts rebuilt from sub-districts), health centres, pincodes.
- The map of India as the Survey of India draws it, including all of Jammu and Kashmir, Ladakh and Arunachal Pradesh. Street-map tiles removed.
- State picker: rankings, dots and pincode areas per state. Gap score both across India and within the state.
- OpenStreetMap pharmacies and hospitals now come from Geofabrik's weekly India extract (Overpass turned our job away).
- Ask the map understands state names and "in India".
- CDSCO reader now reports what the alerts page returned when it finds no lists.

## 0.6.0 (Phase 6)
- Weekly refresh: the Pages workflow re-fetches every source on Mondays and redeploys. A manual "refresh" button is in the Actions tab.
- Design document for an opt-in stock-sharing layer (not built).

## 0.5.0 (Phase 5)
- "Ask the map" box: plain questions (rank districts, one district, compare, pincodes, medicine price) answered from local data by rules.
- Optional AI only when running locally with a key in `.env` (Ollama, free and local, or Gemini free tier). The live site never uses AI.

## 0.4.0 (Phase 4)
- CDSCO drug quality alerts as counts only (CDSCO's terms do not allow copying its lists): per month, per district of the maker's printed address, and per generic name, each linked to the official list. Spurious samples counted only at the reporting state. Map layer with a month timeline.
- NPPA ceiling price parser and medicine check: brand (from anukalpa) to generic, price cap and how many alert samples mention it.
- Drafted permission requests to CDSCO and to the Jan Aushadhi programme (PMBI).

## 0.3.0 (Phase 3)
- Per district: people per Kendra, Kendras per 1 lakh people, medicine outlets per 10,000 people, government health centres per Kendra.
- Gap score (0 to 100) showing where a new Jan Aushadhi or generic store would help most, explained in `docs/gap-score.md`. Map opens coloured by it, with a top-5 list.
- Each district lists up to five pincodes with health centres but no Kendra or mapped pharmacy.

## 0.2.0 (Phase 2)
- Data build (`pipeline/`): Gujarat districts (LGD), 2011 population rebuilt for today's districts, Jan Aushadhi Kendra counts (31 Dec 2025), government health centres (NIC), OpenStreetMap pharmacies and hospitals, pincode totals.
- Map layers: district colours with a choice of measure, pincode totals, dots for health centres, OSM pharmacies and hospitals, and Kendras when a store list is available.
- Click a district, pincode or dot for details. Bharuch checked: 15,51,019 people (2011), 14 Kendras.
- Offline data tests; the browser check now opens Bharuch and turns on every layer.

## 0.1.0 (Phase 1)
- Forked God's Eye View, kept its LICENSE and credit. Original files unchanged.
- New static app in `drishti/`: CesiumJS globe centred on India, no API keys, OpenStreetMap tiles.
- Phone layout (bottom sheet) and desktop layout (side panel). Credits line always visible.
- Headless browser check at 360 px and 1280 px. GitHub Pages workflow.

## 0.0.1 (Phase 0)
- Research report and first list of data sources.
