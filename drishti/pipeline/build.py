"""Build the map data for all of India.

    python3 pipeline/build.py            # use cached downloads where present
    python3 pipeline/build.py --refresh  # fetch everything again (weekly job)
    python3 pipeline/build.py --offline  # never touch the network

Writes small JSON files to public/data/, which the website loads:
  districts.geojson          every district, with its numbers and gap scores
  states/<state>/points.json dots for one state (loaded when that state is picked)
  states/<state>/pincodes.geojson
  meta.json                  states, totals, and which sources worked

A source that fails is reported in meta.json and the build carries on with
the last good copy, so one broken site never breaks the map.
"""
import argparse
import json
import shutil
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import geo  # noqa: E402
import insights  # noqa: E402
import medicines  # noqa: E402
from config import CACHE, OUT, PIPELINE, SIMPLIFY_DISTRICT, SIMPLIFY_PINCODE, URLS  # noqa: E402
from fetch import Blocked, download, fetched_at  # noqa: E402
from geocode import Geocoder  # noqa: E402
from sources import health, jak, osm, population  # noqa: E402

status = {}
OSM_LAST_GOOD = CACHE / "osm_india_last_good.json"
OSM_WORK = PIPELINE / ".osm-work"          # big temporary files, never cached or committed


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
            states = {r[0] for r in rows}
            if total and sum(r[2] for r in rows) == total and len(states) >= 30:
                jak.write_counts(rows, "2025-12-31", "PIB annexure (Rajya Sabha answer)")
                note("jak_annexure", True, f"{len(rows)} districts in {len(states)} states, total {total} (matches)", fetched_at(path))
            else:
                note("jak_annexure", False, f"parsed rows do not add up to the total {total}: kept seed table")
        except Blocked:
            note("jak_annexure", False, "robots.txt does not allow: kept seed table")
        except Exception as exc:
            note("jak_annexure", False, f"{type(exc).__name__}: kept seed table")


def load_osm(args):
    """Pharmacies and hospitals from Geofabrik's India extract (weekly)."""
    if args.offline or not osm.osmium_ready():
        why = "offline" if args.offline else "osmium-tool not installed"
        if OSM_LAST_GOOD.exists():
            note("osm_india", True, f"{why}: used last good copy", fetched_at(OSM_LAST_GOOD))
            return json.loads(OSM_LAST_GOOD.read_text())
        note("osm_india", False, f"{why}: no OSM data in this build")
        return []
    if not args.refresh and OSM_LAST_GOOD.exists():
        note("osm_india", True, "used this week's copy (re-fetched on the Monday refresh)", fetched_at(OSM_LAST_GOOD))
        return json.loads(OSM_LAST_GOOD.read_text())
    try:
        OSM_WORK.mkdir(parents=True, exist_ok=True)
        pbf = download(osm.GEOFABRIK_INDIA, name="india-latest.osm.pbf", refresh=True, timeout=1800, folder=OSM_WORK)
        items = osm.extract(pbf, OSM_WORK)
        OSM_LAST_GOOD.write_text(json.dumps(items, separators=(",", ":")))
        note("osm_india", True, f"{len(items)} pharmacies and hospitals (Geofabrik extract)", fetched_at(pbf))
        return items
    except Exception as exc:
        if OSM_LAST_GOOD.exists():
            note("osm_india", False, f"{type(exc).__name__}: reused last good copy")
            return json.loads(OSM_LAST_GOOD.read_text())
        note("osm_india", False, f"{type(exc).__name__}: no OSM data in this build")
        return []
    finally:
        shutil.rmtree(OSM_WORK, ignore_errors=True)  # the India file is about 1.5 GB


def attach_kendra_counts(districts):
    aliases = geo.load_aliases()
    index = {}
    for d in districts:
        index[(geo.state_key(d["state"]), geo.norm(d["name"]))] = d
    by_lgd = {d["lgd"]: d for d in districts}
    for d in districts:
        for code in d.get("merged_lgd", []):
            by_lgd[code] = d
    unmatched = []
    rows = jak.load_counts(None)
    for row in rows:
        sk = geo.state_key(row["state"])
        d = index.get((sk, geo.norm(row["district"])))
        alias_note = ""
        if not d:
            hit = aliases.get((geo.norm(row["state"]), geo.norm(row["district"])))
            if hit:
                d = by_lgd.get(hit[0])
                alias_note = hit[1]
        if not d:
            unmatched.append(f"{row['district']} ({row['state']})")
            continue
        d["jak_official"] += row["kendras"]
        d["jak_as_on"] = row["as_on"]
        d["jak_listed"] = True
        if alias_note:
            d["notes"].append(f"Includes {row['district']} ({row['kendras']} Kendras). {alias_note}")
    as_on = rows[0]["as_on"] if rows else None
    for d in districts:
        if not d.get("jak_listed") and d["pop2011"]:
            d["jak_as_on"] = as_on
            d["notes"].append("Not listed in the official Kendra table: no Kendra yet, or counted under a neighbouring district.")
    return len(rows), unmatched


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

    # Districts: all of India, as the LGD file draws them (Survey of India based).
    districts = geo.load_all_districts(files["lgd"])
    for d in districts:
        d.update(pop2011=0, jak_official=0, jak_points=0, osm_pharmacy=0, osm_hospital=0, osm_jak=0,
                 phc=0, chc=0, hospital_gov=0, subcentre=0, notes=[])
    merged = geo.apply_merges(districts)
    if merged:
        note("district_merges", True, "; ".join(merged))
    loc = geo.Locator(districts)

    # Population, Census 2011, rebuilt for today's districts.
    pops, estimated = population.by_district_shapes(files["subdistricts"], districts)
    for d in districts:
        d["pop2011"] = pops.get(d["lgd"], 0)
        if estimated.get(d["lgd"]):
            d["pop_estimated"] = True
            d["notes"].append("This district's boundary differs from 2011, so part of its 2011 population is estimated by area.")
        if not d["pop2011"]:
            if d["state"] == "Jammu and Kashmir":
                d["notes"].append("Part of India under Pakistan's illegal occupation. The Census could not be held here, so there are no figures.")
            else:
                d["notes"].append("No Census 2011 figure for this district.")

    # Jan Aushadhi Kendras, official counts.
    n_rows, unmatched = attach_kendra_counts(districts)
    note("jak_counts", not unmatched, f"{n_rows} rows matched" if not unmatched else "no district match for: " + ", ".join(unmatched))

    # Pincode areas, each given the district its middle falls in.
    pincodes = geo.load_pincodes(files["pincodes"])
    pin_loc = geo.Locator(pincodes)
    for p in pincodes:
        p.update(jak=0, osm_pharmacy=0, osm_hospital=0, gov_facilities=0)
        rp = p["geom"].representative_point()
        p["center"] = (round(rp.x, 5), round(rp.y, 5))
        home = loc.find(*p["center"])
        p["district_lgd"] = home["lgd"] if home else None
        p["state"] = home["state"] if home else None

    points = {}

    def bucket(state):
        return points.setdefault(state, {"jak": [], "pharmacy": [], "hospital": [], "gov": []})

    # Government health facilities (NIC). Placed by position.
    covered = {}
    for f in health.load(files["nic_health"]):
        d = loc.find(f["lon"], f["lat"])
        if not d:
            continue
        covered[d["state"]] = covered.get(d["state"], 0) + 1
        t = f["type"]
        key = {"SCE": "subcentre", "PHC": "phc", "CHC": "chc"}.get(t, "hospital_gov")
        d[key] += 1
        p = pin_loc.find(f["lon"], f["lat"])
        if p:
            p["gov_facilities"] += 1
        if t != "SCE":
            bucket(d["state"])["gov"].append([round(f["lon"], 5), round(f["lat"], 5), t, f["name"]])
    no_centres = sorted({d["state"] for d in districts} - set(covered))
    for d in districts:
        if d["state"] in no_centres:
            d["no_centre_data"] = True
            d["notes"].append("The NIC health centre file has no centres for this state, so centre counts are not shown.")
    note("nic_health_coverage", not no_centres, f"centres in {len(covered)} states" + (f"; none for {', '.join(no_centres)}" if no_centres else ""))

    # OpenStreetMap pharmacies and hospitals.
    for it in load_osm(args):
        d = loc.find(it["lon"], it["lat"])
        if not d:
            continue
        p = pin_loc.find(it["lon"], it["lat"])
        b = bucket(d["state"])
        if it["kind"] == "pharmacy":
            d["osm_pharmacy"] += 1
            d["osm_jak"] += 1 if it.get("jak") else 0
            if p:
                p["osm_pharmacy"] += 1
            b["pharmacy"].append([it["lon"], it["lat"], it["osm"], 1 if it.get("jak") else 0])
        else:
            d["osm_hospital"] += 1
            if p:
                p["osm_hospital"] += 1
            b["hospital"].append([it["lon"], it["lat"], it["osm"], it.get("name", "")])

    # Jan Aushadhi store points, only where a store list file is present.
    for state in sorted({d["state"] for d in districts}):
        stores = jak.load_stores(geo.slug(state))
        if not stores:
            continue
        gc = Geocoder({p["pincode"]: p["center"] for p in pincodes if p["state"] == state}, offline=args.offline)
        placed = 0
        for s in stores:
            hit = gc.locate(s["address"], s["pincode"], state)
            if not hit:
                continue
            lon, lat, precision = hit
            d = loc.find(lon, lat)
            p = pin_loc.find(lon, lat)
            if d:
                d["jak_points"] += 1
            if p:
                p["jak"] += 1
            placed += 1
            bucket(state)["jak"].append([lon, lat, s["store_code"], s["pincode"], precision])
        gc.save()
        note(f"jak_stores_{geo.slug(state)}", True, f"{placed} of {len(stores)} stores placed")
    if not any(b["jak"] for b in points.values()):
        note("jak_stores", False, "no store list yet (waiting for PMBI permission): Kendras shown as district totals only")

    # Insights: per-person numbers and gap scores (all India and within each state).
    weights = insights.add_insights(districts)
    pins_by_district = {}
    for p in pincodes:
        pins_by_district.setdefault(p["district_lgd"], []).append(p)
    for d in districts:
        d["pincode_hints"] = insights.pincode_hints(d["lgd"], pins_by_district.get(d["lgd"], []))
    note("gap_score", True, "weights used: " + ", ".join(f"{k} {v}" for k, v in weights.items()))

    # Write the files the website loads.
    OUT.mkdir(parents=True, exist_ok=True)
    feats = []
    for d in districts:
        props = {k: v for k, v in d.items() if k not in ("geom", "merged_lgd", "jak_listed")}
        props["slug"] = geo.slug(d["state"])
        lp = d["geom"].representative_point()
        props["label"] = [round(lp.x, 3), round(lp.y, 3)]  # where the map writes the name
        feats.append(geo.feature(d["geom"], props, SIMPLIFY_DISTRICT))
    (OUT / "districts.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))

    fields = {
        "jak": ["lon", "lat", "store_code", "pincode", "precision"],
        "pharmacy": ["lon", "lat", "osm_id", "named_jan_aushadhi"],
        "hospital": ["lon", "lat", "osm_id", "name"],
        "gov": ["lon", "lat", "type", "name"],
    }
    states = []
    for state in sorted({d["state"] for d in districts}):
        sl = geo.slug(state)
        sdir = OUT / "states" / sl
        sdir.mkdir(parents=True, exist_ok=True)
        own = [d for d in districts if d["state"] == state]
        pfeats = []
        for p in pincodes:
            if p["state"] != state:
                continue
            props = {k: v for k, v in p.items() if k not in ("geom", "center", "state")}
            pfeats.append(geo.feature(p["geom"], props, SIMPLIFY_PINCODE))
        (sdir / "pincodes.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": pfeats}, separators=(",", ":")))
        pts = bucket(state)
        (sdir / "points.json").write_text(json.dumps({"fields": fields, **pts}, separators=(",", ":")))
        xs = [c for d in own for c in d["geom"].bounds[::2]]
        ys = [c for d in own for c in d["geom"].bounds[1::2]]
        states.append({
            "name": state, "slug": sl, "districts": len(own),
            "bbox": [round(min(xs), 3), round(min(ys), 3), round(max(xs), 3), round(max(ys), 3)],
            "pop2011": sum(d["pop2011"] for d in own),
            "jak": sum(d["jak_official"] for d in own),
            "pincodes": len(pfeats),
            "counts": {k: len(v) for k, v in pts.items()},
            "centre_data": state not in no_centres,
        })

    medicines.build_medicines(args, files, note)
    meta = {
        "built": time.strftime("%Y-%m-%d"),
        "india": {"districts": len(districts), "pop2011": sum(d["pop2011"] for d in districts),
                  "jak": sum(d["jak_official"] for d in districts), "gap_weights": weights},
        "states": states,
        "sources": status,
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=1))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
