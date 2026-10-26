# Changelog

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
