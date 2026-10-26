# aushadhi-drishti: Phase 0 research

Date: 26 October 2026. Status: research only, nothing built yet.

Goal of the project: an open map of India's pharmacy supply side, built only from legally public data, shown as district and pincode totals. Gujarat first, Bharuch as the test district.

---

## 1. What already exists, and the gap

| Tool | Who runs it | What it does | Open to the public? |
|---|---|---|---|
| Pharmarack | DigiHealth, a company owned by a group of top Indian drug makers (bought in 2021) | B2B ordering app for chemists and distributors. Says it reaches about 2.5 lakh chemists and 12,000 distributors | No. Data is private and sold as market insight |
| AIOCD AWACS (Pharmatrac) | Same drug-maker group holds about 66% (2021) | Market research from software installed at stockists. Monthly sales reports for the Indian pharma market | No. Paid reports. Only headline numbers reach the press |
| e-Aushadhi / DVDMS | C-DAC for the Health Ministry and states | Supply chain for government warehouses, hospitals and free-drug counters. Live in 27 states/UTs. Has a central dashboard | No. Dashboard is for state officials (login via Parichay). Covers government stock only, not private chemists |
| Jan Aushadhi store locator and Janaushadhi Sugam app | BPPI (Department of Pharmaceuticals) | Find the nearest Jan Aushadhi Kendra, search generic medicines and prices | Yes, for lookup. District-wise counts are also published in Parliament answers |
| publicservicesmap.in | Private directory | Lists Kendras by district with store codes and addresses | Readable, but says its numbers are for discovery only |
| ABDM Health Facility Registry (HFR) | National Health Authority | National register of facilities, including pharmacies | Search exists, but bulk access is through APIs that need approval. Registration is voluntary, so coverage is partial |
| OpenStreetMap health exports | OSM contributors, HOT on HDX | Hospitals, clinics, pharmacies as map points | Yes (ODbL). Coverage of pharmacies is patchy |
| State licensing portals | State drug regulators | Online licence applications. A few show public licence lookups | Varies by state (see section 2) |

**The gap.** The sales side is well covered, but only behind paid walls (Pharmarack, AWACS). The government side (DVDMS) is login-only and covers only public stock. Nobody offers a free, open, district-level view that joins:

- how many medicine outlets an area has per person,
- how well generic stores (Jan Aushadhi) cover it,
- where substandard-drug alerts trace back to, and
- what price caps apply to the medicines.

That joined, public, aggregate view is the space aushadhi-drishti can fill.

**Useful baseline numbers**

- About 12.4 lakh chemists and distributors in India (figure claimed by AIOCD in 2026).
- 17,990 Jan Aushadhi Kendras across 767 districts as on 31 Dec 2025. Gujarat had 848 across all 34 districts. Bharuch had 14.
- Bharuch district population was 15,51,019 in Census 2011. That gives roughly 0.09 Kendras per 10,000 people, using old population figures (see the population row below).

---

## 2. Data inventory

| Dataset | Where | How we can get it | Licence / terms | Coverage and freshness | Use it? |
|---|---|---|---|---|---|
| Jan Aushadhi Kendras, district counts | Parliament answer annexure published by PIB (31 Dec 2025) | One PDF, parse once | Official public document. Cite the source | All India, by district. Updated when Parliament asks, a few times a year | Yes. Ground truth for counts |
| Jan Aushadhi Kendras, store list | janaushadhi.gov.in store locator; older full lists also appear in Parliament annexures | Check robots.txt and terms first. Fetch slowly, once a week | No open licence stated on the site. Government public information | Store code, address, pincode, plus a contact person name and phone | Yes, but **drop the contact name and phone**. Keep store code, address, pincode, district |
| Licensed retail and wholesale outlets, Gujarat | XLN (xln.gujarat.gov.in), reached from fdca.gujarat.gov.in | **No.** The site blocks automated access in its robots rules, and no public list was found | Not open | About 53,000 retail and wholesale licensees use the state app (FDCA, 2024) | No. Use only published state totals |
| Licensed outlets, other states | ONDLS (statedrugs.gov.in), used by about 18 states including Delhi and Kerala. Jharkhand's XLN shows public retailer and wholesaler details | Needs a state-by-state check of terms and robots rules | Not open-licensed | Varies | Later, and only as counts by pincode. Licence records name proprietors and pharmacists |
| OSM pharmacies and hospitals | Geofabrik India extract (Western Zone file about 191 MB, updated daily); Overpass API for small areas | Download extract in CI, filter `amenity=pharmacy`, `amenity=hospital`, `healthcare=*` | ODbL 1.0. Attribution "© OpenStreetMap contributors" and share-alike on the derived data | Uneven. A 2021 bulk import raised counts a lot, but many rural shops are missing | Yes. Label it as "mapped by volunteers, incomplete" |
| CDSCO not-of-standard-quality (NSQ) and spurious alerts | cdsco.gov.in, Alerts page and the newer NSQ alerts page (moved Aug 2025) | Monthly PDFs (central labs, state labs, spurious list). Parse with a PDF table tool | Government website. No open licence. Public regulatory notices, so cite and link each PDF | Monthly since 2017 or earlier. About 150 to 280 samples a month in 2026 | Yes, with care (see legal notes) |
| NPPA ceiling prices | nppaindia.nic.in price notifications (S.O. numbers), plus yearly WPI-revised lists | PDFs. Parse once, then add new notifications | Gazette notifications are public legal documents. Cite S.O. number and date | All scheduled formulations under DPCO 2013. Revised every April | Yes |
| Brand to generic mapping | Your anukalpa repo: `backend/india_disb.csv` (C-DAC / NRCeS Drug Information Service Bundle) and `backend/brands.csv` | Read from the repo at build time | DISB is CC BY 4.0. brands.csv is yours | Snapshot, updated when you rebuild anukalpa | Yes |
| District population | Census 2011 district totals (censusindia.gov.in, data.gov.in) | CSV download | data.gov.in uses GODL-India (attribute the provider, no endorsement claims) | **Old.** Census 2027 counts people in Feb 2027 (reference date 1 Mar 2027) | Yes for now, clearly labelled "2011". Swap in 2027 when released |
| District boundaries | LGD-based layers (bharatlas.com / urbanmorph geodata), geoBoundaries, Datameet | GeoJSON or Parquet download | Per layer: CC0, CC BY 4.0, GODL or ODbL. Check each layer before use | Gujarat has 34 districts now (Vav-Tharad formed in 2025). Older files show 33 or fewer | Yes, an LGD-based layer that includes Vav-Tharad |
| Pincode boundaries | AIKosh "All India Pincode Boundary GeoJSON" (India AI) | GeoJSON download | Open Government License, India | Delivery post office pincodes | Yes. Lets us total things by pincode and skip most geocoding |
| Geocoding | Nominatim (OpenStreetMap) | Only for addresses the pincode step cannot place | Max 1 request a second, a real app name in the request, caching expected, no heavy bulk use | Free | Yes, cached in the repo, single thread |

**Population catch.** Gujarat had 26 districts in 2011 and 34 now. Newer districts were cut from old ones, so their 2011 population must be rebuilt from taluka (sub-district) figures. Bharuch has kept its district boundary since 2011 as far as I can tell, so it is a clean test case. I will confirm this from the LGD layer in Phase 2.

---

## 3. Legal notes (plain words, not legal advice)

**DPDP Act 2023**
- The Rules were notified on 14 Nov 2025. Most duties start in phases, finishing around May 2027.
- The Act does not cover personal data that a person made public, or that was made public under a legal duty. We will not lean on that exception.
- Our own rule is stricter. We never store or show: people's names, phone numbers, pharmacist registration details, or anything about one named pharmacy's or company's sales, stock or shipments.
- Licence-register data is shown only as counts by district or pincode.
- Jan Aushadhi store lists include a contact person and a phone number. The build script deletes those two fields before anything is saved.

**Site terms and scraping**
- No Google Maps data, no Google geocoding.
- Gujarat XLN blocks automated access, so we do not fetch it.
- For every other site: check robots rules and terms before the first fetch, fetch slowly, once a week at most, and record what was checked in DATA_SOURCES.md.
- Nominatim: obey its usage policy (one request a second, cache everything).

**Fairness with drug-quality alerts**
- An NSQ result is about one batch, not the whole company. Every pin will say so and link the CDSCO PDF.
- A "spurious" listing means the named maker says it did **not** make that batch. Pinning it to the named maker's factory would point at the wrong party. Spurious alerts will be shown at the state of the testing lab only, never at a maker's address.

**Map of India**
- Under the 2021 geospatial guidelines, political maps of India must use the Survey of India boundary as the standard. The national outline will come from an SoI-consistent source, and the README will say so.

**Attribution we must show**
- OpenStreetMap: "© OpenStreetMap contributors", with a link to the OSM copyright page. ODbL share-alike applies to our cleaned OSM files.
- GODL-India sources: name the provider, the source and the licence, with the URL. Do not suggest government endorsement.
- DISB (via anukalpa): CC BY 4.0 credit to C-DAC / NRCeS.
- gods-eye-view: keep its MIT LICENSE and copyright line, and credit Bilawal Sidhu in the README.
- Basemap provider's credit stays visible on the map.

**Health disclaimer**
Information only. Not for treatment decisions. Check stock and prices with the store.

---

## 4. Notes on the fork (prep for Phase 1)

**Update after Phase 1:** nothing was deleted from the fork. The original God's Eye View files stay unchanged, and the new app was built in its own `drishti/` folder on the same engine (CesiumJS). "Drop" below now means "not used or shipped by this app".

gods-eye-view is a large app: CesiumJS globe, Vite, plain JavaScript, plus a Node server that hides API keys. It has about 1,900 commits and many live layers (flights, ships, CCTV, voice).

- **Licence.** MIT covers the code only. Its own LICENSE says bundled data is not MIT. The submarine cable data (TeleGeography) is non-commercial, so it will be removed. OSM datacenters and dams will be removed because we do not need them.
- **GitHub Pages.** Pages serves static files only, so the server parts (key proxy, voice, live feeds) must go. The Cesium globe itself works as a static site.
- **Keep:** the globe shell, layer system, search box, attribution panel, share links.
- **Drop:** flights, ships, satellites, CCTV, traffic, radio, weather, voice, street level, launches, military layers, all bundled datasets.
- **Basemap:** the app starts with Esri imagery and needs no key. Esri has its own terms, so I will check them in Phase 1 and fall back to an OSM-based basemap with credit if needed.
- **Phones.** A 3D globe is heavy on a 360 px phone. I plan to open in a flat, top-down view centred on India and test load time at 360 px.

---

## Sources

- [gods-eye-view repo and README](https://github.com/bilawalsidhu/gods-eye-view), [its LICENSE](https://github.com/bilawalsidhu/gods-eye-view/blob/main/LICENSE), [its DATA_SOURCES.md](https://github.com/bilawalsidhu/gods-eye-view/blob/main/DATA_SOURCES.md)
- [Pharmarack acquisition by DigiHealth (Lincoln International)](https://www.lincolninternational.com/transactions/pharmarack-technologies-private-limited-has-been-acquired-by-digihealth-technologies-llp-a-platform-set-up-by-leading-pharmaceutical-companies-in-india/), [Pharmarack and IPA supply chain report](https://biovoicenews.com/?p=57395)
- [Big Eight acquire AIOCD AWACS and Pharmarack (Scrip)](https://scrip.pharmaintelligence.informa.com/SC144116/Indias-Big-Eight-Make-Digital-Leap-With-Two-Acquisitions)
- [MoHFW brief on DVDMS](https://main.mohfw.gov.in/sites/default/files/MMPC%20Brief.pdf), [DVDMS central dashboard letter (NHSRC)](https://qps.nhsrcindia.org/sites/default/files/2025-05/DO-States%20-%20To%20Update%20Nomenclature%20of%20Facilities%20on%20DVDMS%20as%20Per%20IPHS.pdf)
- [District-wise Jan Aushadhi Kendras as on 31.12.2025 (PIB)](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202626781301.pdf)
- [publicservicesmap.in Jan Aushadhi directory](https://www.publicservicesmap.in/jan-aushadhi/listings/rajasthan)
- [Gujarat FDCA mDMLA app (BioSpectrum)](https://biospectrumindia.com/news/22/24001/gujarat-becomes-first-indian-state-to-launch-fdca-mdmla-app-for-online-medicine-licensing.html), [53k licensees on the app (Digital Health News)](https://www.digitalhealthnews.com/over-6k-drug-manufacturers-53k-retailers-using-mdmla-mobile-app-in-gujarat), [Gujarat licensing on XLN (calcguru)](https://calcguru.in/?p=5173)
- [ONDLS overview](https://vajiramandravi.com/current-affairs/online-national-drugs-licensing-system-ondls-portal/), [Jharkhand XLN public tools (calcguru)](https://calcguru.in/?p=5198)
- [CDSCO Alerts page](https://cdsco.gov.in/opencms/opencms/en/Notifications/Alerts/), [August 2026 NSQ numbers](https://www.newkerala.com/news/a/central-drugs-laboratories-flags-220-drug-samples-as-574.htm), [spurious alerts do not name the real maker (Business Standard)](https://www.business-standard.com/industry/news/cdsco-flags-4-drugs-spurious-185-not-standard-quality-june-2025-125071801459_1.html)
- [NPPA ceiling prices in Parliament answer](https://eparlib.nic.in/bitstream/123456789/2979128/1/AU1958_86y5AJ.pdf)
- [anukalpa repo](https://github.com/falakpat3l/anukalpa)
- [Census 2027 schedule (Wikipedia)](https://en.wikipedia.org/wiki/2027_census_of_India), [Bharuch district (Wikipedia)](https://en.wikipedia.org/wiki/Bharuch_district), [Gujarat districts list](https://en.wikipedia.org/wiki/List_of_districts_of_Gujarat), [Vav-Tharad district](https://en.wikipedia.org/wiki/Vav-Tharad_district)
- [bharatlas / urbanmorph geodata](https://awesome.ecosyste.ms/projects/github.com%2Furbanmorph%2Fgeodata), [geoBoundaries India (HDX)](https://data.humdata.org/m/dataset/geoboundaries-admin-boundaries-for-india), [Datameet districts](https://projects.datameet.org/maps/districts/), [AIKosh pincode boundaries](https://aikosh.indiaai.gov.in/home/datasets/details/all_india_pincode_boundary_geo_json.html)
- [Geofabrik India extracts](https://download.geofabrik.de/asia/india.html), [OSM health data in India (HeiGIT)](https://heigit.org/?p=21802), [Nominatim usage policy summary](https://moltchat-agent-commons.onrender.com/wiki/Nominatim_geocoding_usage_policy_and_rate_limits)
- [GODL-India and OSM (OSM wiki)](https://wiki.openstreetmap.org/wiki/Open_Geospatial_Data_from_Government_of_India), [India mapping rules (OSM wiki)](https://wiki.openstreetmap.org/wiki/India/Government_of_India)
- [DPDP Rules 2025 (PIB)](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf), [phased dates (AZB)](https://www.azbpartners.com/bank/indias-digital-personal-data-protection-act-phased-rollout-and-key-compliance-milestones/), [public data exemption (Vision IAS)](https://visionias.in/current-affairs/monthly-magazine/2025-12-23/polity-and-governance/digital-personal-data-protection-dpdp-rules-2025)
- [AIOCD chemist count (ETV Bharat)](https://www.etvbharat.com/en/health/pharmacies-across-india-shut-may-20-epharmacy-concerns-enn26051305103)
