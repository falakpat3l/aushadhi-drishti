"""Build the map data.

    python3 pipeline/build.py            # use cached downloads where present
    python3 pipeline/build.py --refresh  # fetch everything again (weekly job)
    python3 pipeline/build.py --offline  # never touch the network

Writes small JSON files to public/data/, which the website loads.
A source that fails is reported in public/data/meta.json and the build
carries on with the last good copy, so one broken site never breaks the map.
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import geo  # noqa: E402
from config import CACHE, OUT, SIMPLIFY_DISTRICT, SIMPLIFY_PINCODE, STATES, URLS  # noqa: E402
from fetch import Blocked, download, fetched_at  # noqa: E402
from geocode import Geocoder  # noqa: E402
from sources import health, jak, osm, population  # noqa: E402

status = {}


def note(source, ok, detail="", fetched=None):
    status[source] = {"ok": ok, "detail": detail, "fetched": fetched or time.strftime("%Y-%m-%d")}
    print(f"[{'ok' if ok else 'GAP'}] {source}: {detail}")


def get(key, args, name):
    path = download(URLS[key], name=name, refresh=args.refresh, offline=args.offline)
    note(key, True, path.name, fetched_at(path))
    return path


def refresh_jak_counts(args):
    """Re-read the PIB annexure PDFs. Keep the seed table unless the parse checks out."""
    if args.offline:
        note("jak_annexure", True, "offline: using seed table")
        return
    try:
        import pdfplumber
    except ImportError:
        note("jak_annexure", False, "pdfplumber not installed: using seed table")
        return
    for url in URLS["jak_annexures"]:
        try:
            path = download(url, refresh=args.refresh, timeout=120)
            with pdfplumber.open(path) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            rows, total = jak.parse_annexure(text)
            if total and sum(r[2] for r in rows) == total:
                jak.write_counts(rows, "2025-12-31", "PIB annexure (Rajya Sabha answer)")
                note("jak_annexure", True, f"{len(rows)} districts, total {total} (matches)", fetched_at(path))
            else:
                note("jak_annexure", False, f"parsed sum does not match total {total}: kept seed table")
        except Blocked:
            note("jak_annexure", False, "robots.txt does not allow: kept seed table")
        except Exception as exc:
            note("jak_annexure", False, f"{type(exc).__name__}: kept seed table")


def osm_backup(slug):
    return CACHE / f"osm_{slug}_last_good.json"


def build_state(state, cfg, files, args):
    slug = cfg["slug"]
    out_dir = OUT / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    aliases = geo.load_aliases()

    districts = geo.load_districts(files["lgd"], cfg["lgd_state"])
    by_lgd = {d["lgd"]: d for d in districts}
    for d in districts:
        d.update(pop2011=0, jak_official=0, jak_points=0, osm_pharmacy=0, osm_hospital=0, osm_jak=0,
                 phc=0, chc=0, hospital_gov=0, subcentre=0, notes=[])
    loc = geo.Locator(districts)

    # Population, Census 2011, rebuilt for today's districts.
    pops = population.by_district(files["subdistricts"], cfg["lgd_state"])
    for code, n in pops.items():
        if code in by_lgd:
            by_lgd[code]["pop2011"] = n

    # Jan Aushadhi Kendras, official counts.
    title = state.title()
    unmatched = []
    for row in jak.load_counts(title):
        hit = aliases.get((geo.norm(title), geo.norm(row["district"])))
        if not hit or hit[0] not in by_lgd:
            unmatched.append(row["district"])
            continue
        code, alias_note = hit
        by_lgd[code]["jak_official"] += row["kendras"]
        by_lgd[code]["jak_as_on"] = row["as_on"]
        if alias_note:
            by_lgd[code]["notes"].append(f"Includes {row['district']} ({row['kendras']} Kendras). {alias_note}")
    if unmatched:
        note(f"jak_counts_{slug}", False, "no district match for: " + ", ".join(unmatched))

    # Pincode areas.
    pincodes = geo.load_pincodes(files["pincodes"], cfg["postal_circle"])
    pin_loc = geo.Locator(pincodes)
    for p in pincodes:
        p.update(jak=0, osm_pharmacy=0, osm_hospital=0, gov_facilities=0)
        rp = p["geom"].representative_point()
        p["center"] = (round(rp.x, 5), round(rp.y, 5))

    def place(lon, lat):
        d = loc.find(lon, lat)
        p = pin_loc.find(lon, lat)
        return d, p

    points = {"jak": [], "pharmacy": [], "hospital": [], "gov": []}

    # Government health facilities.
    for f in health.load(files["nic_health"], state):
        d, p = place(f["lon"], f["lat"])
        if not d:
            continue
        t = f["type"]
        if t == "SCE":
            d["subcentre"] += 1
        elif t == "PHC":
            d["phc"] += 1
        elif t == "CHC":
            d["chc"] += 1
        else:
            d["hospital_gov"] += 1
        if p:
            p["gov_facilities"] += 1
        if t != "SCE":
            points["gov"].append([round(f["lon"], 5), round(f["lat"], 5), t, f["name"]])

    # OpenStreetMap pharmacies and hospitals.
    osm_items = None
    try:
        path = download(URLS["overpass"], name=f"overpass_{slug}.json", refresh=args.refresh,
                        offline=args.offline, data="data=" + osm.query_for(cfg["iso"]), timeout=400, min_gap=5)
        osm_items = osm.parse(path)
        osm_backup(slug).write_text(json.dumps(osm_items, separators=(",", ":")))
        note(f"osm_{slug}", True, f"{len(osm_items)} places", fetched_at(path))
    except Exception as exc:
        if osm_backup(slug).exists():
            osm_items = json.loads(osm_backup(slug).read_text())
            note(f"osm_{slug}", False, f"{type(exc).__name__}: reused last good copy")
        else:
            osm_items = []
            note(f"osm_{slug}", False, f"{type(exc).__name__}: no OSM data in this build")
    for it in osm_items:
        d, p = place(it["lon"], it["lat"])
        if not d:
            continue
        if it["kind"] == "pharmacy":
            d["osm_pharmacy"] += 1
            d["osm_jak"] += 1 if it.get("jak") else 0
            if p:
                p["osm_pharmacy"] += 1
            points["pharmacy"].append([round(it["lon"], 5), round(it["lat"], 5), it["osm"], 1 if it.get("jak") else 0])
        else:
            d["osm_hospital"] += 1
            if p:
                p["osm_hospital"] += 1
            points["hospital"].append([round(it["lon"], 5), round(it["lat"], 5), it["osm"], it.get("name", "")])

    # Jan Aushadhi store points, only if a store list is available.
    stores = jak.load_stores(slug)
    if stores:
        gc = Geocoder({p["pincode"]: p["center"] for p in pincodes}, offline=args.offline)
        placed = 0
        for s in stores:
            hit = gc.locate(s["address"], s["pincode"], title)
            if not hit:
                continue
            lon, lat, precision = hit
            d, p = place(lon, lat)
            if d:
                d["jak_points"] += 1
            if p:
                p["jak"] += 1
            placed += 1
            points["jak"].append([lon, lat, s["store_code"], s["pincode"], precision])
        gc.save()
        note(f"jak_stores_{slug}", True, f"{placed} of {len(stores)} stores placed ({gc.asked} new geocoder calls)")
    else:
        note(f"jak_stores_{slug}", False, "no store list yet: Kendras shown as district totals only")

    # Write the files the website loads.
    feats = []
    for d in districts:
        props = {k: v for k, v in d.items() if k != "geom"}
        feats.append(geo.feature(d["geom"], props, SIMPLIFY_DISTRICT))
    (out_dir / "districts.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))

    pfeats = []
    for p in pincodes:
        props = {k: v for k, v in p.items() if k not in ("geom", "center")}
        pfeats.append(geo.feature(p["geom"], props, SIMPLIFY_PINCODE))
    (out_dir / "pincodes.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": pfeats}, separators=(",", ":")))

    pts = {"fields": {
        "jak": ["lon", "lat", "store_code", "pincode", "precision"],
        "pharmacy": ["lon", "lat", "osm_id", "named_jan_aushadhi"],
        "hospital": ["lon", "lat", "osm_id", "name"],
        "gov": ["lon", "lat", "type", "name"],
    }, **points}
    (out_dir / "points.json").write_text(json.dumps(pts, separators=(",", ":")))
    return districts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args()

    files = {
        "lgd": get("lgd_districts", args, "LGD_Districts.parquet"),
        "subdistricts": get("subdistricts_2011", args, "SubDistricts_2011.parquet"),
        "pincodes": get("pincodes", args, "Datagov_Pincode_Boundaries.parquet"),
        "nic_health": get("nic_health", args, "INDIA_HEALTH_FACILITIES_NIC.geojson"),
    }
    refresh_jak_counts(args)

    states = []
    for state, cfg in STATES.items():
        districts = build_state(state, cfg, files, args)
        states.append({"name": state.title(), "slug": cfg["slug"], "districts": len(districts)})

    OUT.mkdir(parents=True, exist_ok=True)
    meta = {"built": time.strftime("%Y-%m-%d"), "states": states, "sources": status}
    (OUT / "meta.json").write_text(json.dumps(meta, indent=1))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
