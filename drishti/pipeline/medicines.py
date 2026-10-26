"""Phase 4: drug quality alerts (CDSCO) and price caps (NPPA), linked to
generic names from anukalpa. Writes public/data/alerts.json and
public/data/medicines.json, plus a copy of anukalpa's India list for the
medicine search box."""
import json
import re
import shutil

from config import OUT
from fetch import Blocked, download, fetched_at
from places import IndiaPlaces
from sources import anukalpa, cdsco, nppa

CDSCO_ALERTS_PAGE = "https://cdsco.gov.in/opencms/opencms/en/Notifications/Alerts/"
NPPA_PRICE_PDFS = [
    # Filled in once the official consolidated list URL is confirmed; see DATA_SOURCES.md.
]
KIND_CODE = {"nsq_central": "N", "nsq_state": "S", "spurious": "X"}
KEEP_MONTHS = 36


def build_alerts(args, files, note):
    places = IndiaPlaces(files["lgd"], files["pincodes"])
    items, sources = [], []
    try:
        page = download(CDSCO_ALERTS_PAGE, name="cdsco_alerts.html", refresh=args.refresh, offline=args.offline, timeout=120)
        links = cdsco.list_alert_links(page.read_text(encoding="utf-8", errors="replace"))
        months = sorted({l["month"] for l in links}, reverse=True)[:KEEP_MONTHS]
        links = [l for l in links if l["month"] in months]
        parsed = 0
        for link in links:
            key = "cdsco_" + re.sub(r"[^A-Za-z0-9]", "", link["url"].split("num_id=")[-1]) + ".pdf"
            try:
                pdf = download(link["url"], name=key, offline=args.offline, timeout=180, min_gap=2)
                rows = cdsco.parse_pdf(pdf)
            except Exception:
                continue
            parsed += 1
            src = len(sources)
            sources.append({"title": link["title"], "url": link["url"]})
            for r in rows:
                items.append({**r, "month": link["month"], "kind": link["kind"], "src": src})
        note("cdsco_pdfs", bool(items), f"{parsed} of {len(links)} monthly PDFs read, {len(items)} samples", fetched_at(page))
    except Blocked:
        note("cdsco_pdfs", False, "robots.txt does not allow")
    except Exception as exc:
        note("cdsco_pdfs", False, f"{type(exc).__name__}: no CDSCO alerts in this build")

    data, unique = summarise(items, places, sources)
    (OUT / "alerts.json").write_text(json.dumps(data, separators=(",", ":")))
    return unique


def summarise(items, places, sources):
    """Alert rows in, counts out. Returns (public data, de-duplicated rows)."""
    # Remove repeats (a revised list repeats the original rows).
    seen, unique = set(), []
    for it in items:
        k = (it["product"].lower(), it["batch"].lower(), it["maker"].lower()[:40])
        if k in seen:
            continue
        seen.add(k)
        unique.append(it)

    # Publish counts only. CDSCO's website policy does not allow its lists to
    # be reproduced without permission, so no product, batch or maker text
    # leaves this function. Each count links back to the official list.
    place_rows, place_index, counts, months = [], {}, {}, {}

    def place_id(loc):
        key = (loc[0], loc[1])
        if key not in place_index:
            place_index[key] = len(place_rows)
            place_rows.append([loc[0], loc[1], loc[2], loc[3]])
        return place_index[key]

    for it in unique:
        if it["kind"] == "spurious":
            # Never at the named maker: at the state that reported it.
            state = places.state_in(it["reporter"]) or places.state_in(it["maker"])
            pt = places.state_point(state) if state else None
            loc = (pt[0], pt[1], "state", f"Reported in {state}") if pt else None
        else:
            loc = places.coarse(it["maker"], cdsco.find_pincode(it["maker"]))
        pid = place_id(loc) if loc else -1
        m = months.setdefault(it["month"], {"m": it["month"], "nsq": 0, "spurious": 0, "src": []})
        m["spurious" if it["kind"] == "spurious" else "nsq"] += 1
        if it["src"] not in m["src"]:
            m["src"].append(it["src"])
        key = (it["month"], KIND_CODE[it["kind"]], pid)
        counts[key] = counts.get(key, 0) + 1

    data = {
        "note": "Counts only, made from CDSCO's monthly lists. Open the linked CDSCO list for the details.",
        "kinds": {"N": "Not of standard quality (central labs)", "S": "Not of standard quality (state labs)",
                  "X": "Spurious (named maker says it did not make it)"},
        "months": sorted(months.values(), key=lambda m: m["m"]),
        "places": place_rows,
        "counts": [[m, k, p, n] for (m, k, p), n in sorted(counts.items())],
        "sources": sources,
    }
    return data, unique


def build_prices(args, note):
    rows = []
    for url in NPPA_PRICE_PDFS:
        try:
            pdf = download(url, refresh=args.refresh, offline=args.offline, timeout=180)
            rows.extend(nppa.parse_pdf(pdf, url))
        except Exception as exc:
            note("nppa_pdf", False, f"{type(exc).__name__} for {url}")
    if rows:
        nppa.write_seed(rows)
        note("nppa_prices", True, f"{len(rows)} ceiling prices from NPPA PDFs")
    else:
        rows = nppa.load_seed()
        note("nppa_prices", bool(rows), f"{len(rows)} ceiling prices from the seed table" if rows else "no price list yet")
    return rows


def build_medicines(args, files, note):
    items = build_alerts(args, files, note)
    prices = build_prices(args, note)
    salts = {}
    try:
        path = download(anukalpa.URL, name="anukalpa_IN.json", refresh=args.refresh, offline=args.offline)
        data = anukalpa.load(path)
        salts = anukalpa.salt_index(data)
        shutil.copyfile(path, OUT / "anukalpa-IN.json")
        note("anukalpa", True, f"{len(data['rows'])} brands, {len(salts)} generic names", fetched_at(path))
    except Exception as exc:
        note("anukalpa", False, f"{type(exc).__name__}: medicine search will not find brands")

    # How many alert samples mention each generic name (common names only).
    common = [s for s, n in salts.items() if n >= 3 and len(s) >= 5]
    first_words = {}
    for s in common:
        first_words.setdefault(s.split()[0], []).append(s)
    alert_counts = {}
    for it in items:
        text = it["product"].lower()
        for word in set(re.findall(r"[a-z]{5,}", text)):
            for s in first_words.get(word, []):
                if s in text:
                    c = alert_counts.setdefault(s, {"n": 0, "months": {}})
                    c["n"] += 1
                    c["months"][it["month"]] = c["months"].get(it["month"], 0) + 1
    by_generic = {s: {"n": c["n"], "months": sorted(c["months"].items(), reverse=True)} for s, c in alert_counts.items()}
    (OUT / "medicines.json").write_text(json.dumps({"prices": prices, "alerts_by_generic": by_generic}, separators=(",", ":")))
