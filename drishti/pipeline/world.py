"""Countries outside India: Singapore and New Zealand (more can be added).

    python3 pipeline/world.py            # use cached downloads where present
    python3 pipeline/world.py --refresh  # fetch again (weekly job)
    python3 pipeline/world.py --offline  # never touch the network

India's gap score is built on Jan Aushadhi Kendras, which only exist in
India. For other countries the map shows an "access score" made the same
way (ranks from 0 to 100), from two signals:

1. People per pharmacy (60%): more people sharing one pharmacy is worse.
2. Share of people aged 65 and over (40%): older people use more medicines,
   so the same number of pharmacies has to serve more need.

Writes public/data/world/<code>/ : regions.geojson, points.json,
basemap.json and meta.json.
"""
import argparse
import csv
import io
import json
import re
import shutil
import sys
import time
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from shapely.geometry import Point, box, mapping, shape  # noqa: E402
from shapely.ops import unary_union  # noqa: E402

import geo  # noqa: E402
from config import CACHE, OUT, PIPELINE, SEEDS  # noqa: E402
from fetch import download, fetched_at  # noqa: E402
from insights import percentile_ranks  # noqa: E402
from sources import osm  # noqa: E402

NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"
DATAGOV = "https://api-open.data.gov.sg/v1/public/api/datasets/{}/poll-download"
SG_AREAS = "d_4765db0e87b9c86336792efe8a1f7a66"        # URA Master Plan 2019 planning areas
SG_PHARMACIES = "d_bb92615f43de22933e4479558b1f6c36"   # HSA retail pharmacy locations
SG_POPULATION = "https://www.singstat.gov.sg/files/a2b9150d-9ed4-4c0b-ab20-a26035f95065.zip"  # residents by planning area, age, June 2026
NZ_POPULATION = "https://figure.nz/table/MMRyjOwoiupNd0JF/download"  # Census 2023 by region and age (Stats NZ via Figure.NZ)
NZ_OSM = "https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf"
WEIGHTS = {"people_per_pharmacy": 0.6, "share_65": 0.4}

AU_POPULATION = "https://data.api.abs.gov.au/rest/data/ABS,ERP_Q,1.0.0/all?startPeriod={}&format=csvfilewithlabels"
AU_OSM = "https://download.geofabrik.de/australia-oceania/australia-latest.osm.pbf"
EU_REGIONS = "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2024_4326_LEVL_2.geojson"
EU_POPULATION = "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/demo_r_pjanaggr3/A.NR.T.TOTAL+Y_GE65.?format=SDMX-CSV&startPeriod={}"
EU_PHARMACISTS = "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/hlth_rs_prs1/A.HAB_P..OC2262.?format=SDMX-CSV&startPeriod=2015"

COUNTRIES = {
    "sg": {"name": "Singapore", "iso3": "SGP", "bbox": [103.55, 1.13, 104.15, 1.50], "unit": "planning area"},
    "nz": {"name": "New Zealand", "iso3": "NZL", "bbox": [165.8, -47.5, 179.0, -34.0], "unit": "region"},
    "au": {"name": "Australia", "iso3": "AUS", "bbox": [112.5, -44.0, 154.0, -10.0], "unit": "state or territory"},
    "eu": {"name": "Europe", "iso3": None, "bbox": [-25.0, 34.0, 45.0, 71.5], "unit": "region (NUTS 2)"},
}

status = {}


def note(key, ok, detail="", fetched=None):
    status[key] = {"ok": ok, "detail": detail, "fetched": fetched or time.strftime("%Y-%m-%d")}
    print(f"[{'ok' if ok else 'GAP'}] {key}: {detail}")


def datagov(dataset, name, args):
    """data.gov.sg gives a short-lived link to each file; ask for it, then download."""
    meta = download(DATAGOV.format(dataset), name=f"{name}.link.json", refresh=True, offline=args.offline)
    url = json.loads(meta.read_text())["data"]["url"]
    return download(url, name=name, refresh=args.refresh, offline=args.offline)


# ---------- Singapore ----------

def sg_population(path):
    """Residents by planning area: total and aged 65+. The CSV inside the zip
    has one row per planning area, subzone, age, sex and dwelling type."""
    with zipfile.ZipFile(path) as z:
        name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
        text = z.read(name).decode("utf-8-sig", "replace")
    rows = list(csv.DictReader(io.StringIO(text)))
    cols = {c.lower(): c for c in rows[0]}
    area = cols.get("pa") or next(c for k, c in cols.items() if "planning" in k)
    age = cols.get("age") or cols.get("ag") or next(c for k, c in cols.items() if k.startswith("age"))
    pop = cols.get("pop") or next(c for k, c in cols.items() if "pop" in k)
    out = {}
    for r in rows:
        a = (r[area] or "").strip().upper()
        try:
            n = int(float(r[pop] or 0))
        except ValueError:
            continue
        m = re.match(r"\s*(\d+)", r[age] or "")
        if not a or not m:
            continue  # skips "Total" rows
        d = out.setdefault(a, {"people": 0, "aged_65_plus": 0})
        d["people"] += n
        if int(m.group(1)) >= 65:
            d["aged_65_plus"] += n
    return out


def build_sg(args):
    areas = json.loads(datagov(SG_AREAS, "sg_planning_areas.geojson", args).read_text())
    regions = []
    for f in areas["features"]:
        p = f["properties"]
        regions.append({"id": p["PLN_AREA_C"], "name": p["PLN_AREA_N"].title(), "key": p["PLN_AREA_N"].upper(),
                        "geom": shape(f["geometry"]).buffer(0)})
    note("sg_areas", True, f"{len(regions)} planning areas (URA Master Plan 2019)")
    try:
        pops = sg_population(download(SG_POPULATION, name="sg_population.zip", refresh=args.refresh, offline=args.offline))
        for r in regions:
            r.update(pops.get(r["key"], {"people": 0, "aged_65_plus": 0}))
        note("sg_population", True, f"residents by planning area, June 2026 ({sum(r['people'] for r in regions):,} people)")
    except Exception as exc:
        note("sg_population", False, f"{type(exc).__name__}: no population in this build")
    ph = json.loads(datagov(SG_PHARMACIES, "sg_pharmacies.geojson", args).read_text())
    points = []
    for f in ph["features"]:
        lon, lat = f["geometry"]["coordinates"][:2]
        name = (f["properties"].get("PHARMACY_NAME") or "").strip()
        points.append([round(lon, 5), round(lat, 5), name])
    note("sg_pharmacies", True, f"{len(points)} retail pharmacies (HSA)")
    return regions, points, "Retail pharmacies (HSA, via data.gov.sg)"


# ---------- New Zealand ----------

NZ_NAMES = {"Marlborough District": "Marlborough", "Nelson City": "Nelson", "Tasman District": "Tasman", "Gisborne District": "Gisborne"}


def nz_population(args):
    try:
        path = download(NZ_POPULATION, name="nz_population.csv", refresh=args.refresh, offline=args.offline, min_gap=10)
        rows = list(csv.DictReader(io.StringIO(path.read_text(encoding="utf-8-sig"))))
        out = {}
        for r in rows:
            if r["Census year"] != "2023" or "population count" not in r["Measure"].lower():
                continue
            reg = r["Region Code"].replace(" Region", "").strip()
            d = out.setdefault(reg, {"people": 0, "aged_65_plus": 0})
            v = float(r["Value"] or 0)
            if r["Age group"].lower() == "total":
                d["people"] = int(v)
            elif re.match(r"\d", r["Age group"]) and int(re.match(r"(\d+)", r["Age group"]).group(1)) >= 65:
                d["aged_65_plus"] += int(v)
        note("nz_population", True, "Census 2023 by region (Stats NZ via Figure.NZ)", fetched_at(path))
        return out
    except Exception as exc:
        out = {}
        with open(SEEDS / "world" / "nz_population_2023.csv", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                out[r["region"].replace(" Region", "")] = {"people": int(r["people"]), "aged_65_plus": int(r["aged_65_plus"])}
        note("nz_population", True, f"{type(exc).__name__}: used the seed table (Census 2023)")
        return out


def build_nz(args):
    admin1 = json.loads(download(f"{NE}/ne_10m_admin_1_states_provinces.geojson", name="ne_10m_admin_1.geojson", offline=args.offline).read_text())
    pops = nz_population(args)
    regions = []
    for f in admin1["features"]:
        p = f["properties"]
        if p.get("adm0_a3") != "NZL" or not p.get("type_en") or p["type_en"] == "Special Island Authority":
            continue  # skips Tokelau, the Chatham Islands and the small outlying islands (no regional data)
        name = NZ_NAMES.get(p["name"], p["name"])
        r = {"id": name.lower().replace(" ", "-").replace("'", ""), "name": name, "geom": shape(f["geometry"]).buffer(0)}
        r.update(pops.get(name, {"people": 0, "aged_65_plus": 0}))
        regions.append(r)
    note("nz_regions", True, f"{len(regions)} regions (Natural Earth)")
    points = osm_pharmacies("nz", NZ_OSM, args)
    return regions, points, "Pharmacies in OpenStreetMap (via Geofabrik)"


# ---------- Australia ----------

def au_population(args):
    """Latest estimated resident population by state: total and aged 65+ (ABS)."""
    start = f"{time.gmtime().tm_year - 1}-Q1"
    path = download(AU_POPULATION.format(start), name="au_population.csv", refresh=args.refresh, offline=args.offline,
                    headers={"Accept": "text/csv"}, timeout=180)
    rows = [r for r in csv.DictReader(io.StringIO(path.read_text(encoding="utf-8-sig")))
            if r["Measure"].strip().lower().startswith("estimated resident population") and r["Sex"].strip().lower() == "persons"]
    latest = max(r["TIME_PERIOD"] for r in rows)
    out = {}
    for r in rows:
        if r["TIME_PERIOD"] != latest:
            continue
        d = out.setdefault(r["Region"].strip(), {"people": 0, "aged_65_plus": 0})
        code = r["AGE"].strip()
        v = int(float(r["OBS_VALUE"] or 0))
        if code in ("TT", "TOT") or r["Age"].strip().lower() in ("all ages", "total"):
            d["people"] = v
        elif code.isdigit() and int(code) >= 65:
            d["aged_65_plus"] += v  # single years of age, 65 to 100 and over
    note("au_population", True, f"ABS estimated resident population, {latest}", fetched_at(path))
    return out


def osm_pharmacies(code, url, args):
    """Pharmacies from a Geofabrik extract, re-read only on the weekly refresh."""
    last = CACHE / f"osm_{code}_last_good.json"
    items = None
    if not args.offline and osm.osmium_ready() and (args.refresh or not last.exists()):
        work = PIPELINE / ".osm-work"
        try:
            pbf = download(url, name=f"{code}.osm.pbf", refresh=True, timeout=3600, folder=work)
            items = osm.extract(pbf, work)
            last.write_text(json.dumps(items))
            note(f"{code}_osm", True, f"{len(items)} pharmacies and hospitals (Geofabrik)")
        except Exception as exc:
            note(f"{code}_osm", False, f"{type(exc).__name__}")
        finally:
            shutil.rmtree(work, ignore_errors=True)
    if items is None and last.exists():
        items = json.loads(last.read_text())
        note(f"{code}_osm", True, "used this week's copy")
    if items is None:
        note(f"{code}_osm", False, "no OpenStreetMap data in this build")
        items = []
    return [[it["lon"], it["lat"], it["osm"]] for it in items if it["kind"] == "pharmacy"]


def build_au(args):
    admin1 = json.loads(download(f"{NE}/ne_10m_admin_1_states_provinces.geojson", name="ne_10m_admin_1.geojson", offline=args.offline).read_text())
    try:
        pops = au_population(args)
    except Exception as exc:
        pops = {}
        note("au_population", False, f"{type(exc).__name__}: no population in this build")
    regions = []
    for f in admin1["features"]:
        p = f["properties"]
        if p.get("adm0_a3") != "AUS" or p.get("type_en") not in ("State", "Territory"):
            continue  # skips small external territories
        name = p["name"]
        r = {"id": name.lower().replace(" ", "-"), "name": name, "geom": shape(f["geometry"]).buffer(0)}
        r.update(pops.get(name, {"people": 0, "aged_65_plus": 0}))
        regions.append(r)
    note("au_regions", True, f"{len(regions)} states and territories (Natural Earth)")
    return regions, osm_pharmacies("au", AU_OSM, args), "Pharmacies in OpenStreetMap (via Geofabrik)"


# ---------- Europe ----------

def eurostat_rows(url, name, args):
    path = download(url, name=name, refresh=args.refresh, offline=args.offline, timeout=180)
    return list(csv.DictReader(io.StringIO(path.read_text(encoding="utf-8-sig"))))


def build_eu(args):
    """NUTS 2 regions: people and the share aged 65+ (2025). Pharmacists are
    only published by country, so each region carries its country's figure."""
    nuts = json.loads(download(EU_REGIONS, name="eu_nuts2.geojson", refresh=args.refresh, offline=args.offline, timeout=180).read_text())
    area = box(*COUNTRIES["eu"]["bbox"])
    regions = []
    for f in nuts["features"]:
        p = f["properties"]
        g = shape(f["geometry"]).buffer(0)
        if not g.intersects(area):
            continue  # leaves out overseas regions (for example French Guiana)
        regions.append({"id": p["NUTS_ID"], "name": p.get("NAME_LATN") or p["NUTS_ID"], "country": p["CNTR_CODE"], "geom": g})
    note("eu_regions", True, f"{len(regions)} NUTS 2 regions (GISCO, 2024)")
    try:
        rows = eurostat_rows(EU_POPULATION.format(time.gmtime().tm_year - 2), "eu_population.csv", args)
        latest = max(r["TIME_PERIOD"] for r in rows)
        pops = {}
        for r in rows:
            if r["TIME_PERIOD"] != latest or not r["OBS_VALUE"]:
                continue
            d = pops.setdefault(r["geo"], {"people": 0, "aged_65_plus": 0})
            d["people" if r["age"] == "TOTAL" else "aged_65_plus"] = int(float(r["OBS_VALUE"]))
        for r in regions:
            r.update(pops.get(r["id"], {"people": 0, "aged_65_plus": 0}))
        note("eu_population", True, f"Eurostat population on 1 January {latest}")
    except Exception as exc:
        note("eu_population", False, f"{type(exc).__name__}: no population in this build")
    try:
        rows = eurostat_rows(EU_PHARMACISTS, "eu_pharmacists.csv", args)
        best = {}
        for r in rows:  # prefer practising pharmacists; take each country's latest year
            if not r["OBS_VALUE"] or len(r["geo"]) != 2:
                continue
            rank = {"PRACT": 3, "PROACT": 2, "LIC": 1}.get(r["wstatus"], 0)
            key = (rank, r["TIME_PERIOD"])
            if r["geo"] not in best or key > best[r["geo"]][0]:
                best[r["geo"]] = (key, float(r["OBS_VALUE"]))
        country = {"EL": "GR"}
        for r in regions:
            hit = best.get(r["country"]) or best.get(country.get(r["country"], ""))
            r["people_per_pharmacist"] = round(hit[1]) if hit else None
        note("eu_pharmacists", True, f"inhabitants per pharmacist for {len(best)} countries (Eurostat)")
    except Exception as exc:
        note("eu_pharmacists", False, f"{type(exc).__name__}: no pharmacist figures in this build")
    return regions, [], "Pharmacists per country (Eurostat); no pharmacy dots for Europe"


# ---------- shared ----------

def add_measures(regions, points):
    loc = geo.Locator(regions)
    for r in regions:
        r["pharmacies"] = 0
    for p in points:
        r = loc.find(p[0], p[1])
        if r:
            r["pharmacies"] += 1
    for r in regions:
        n, ph, old = r.get("people", 0), r["pharmacies"], r.get("aged_65_plus", 0)
        r["share_65"] = round(old / n * 100, 1) if n else None
        r["per_10k"] = round(ph / n * 1e4, 2) if n and points else None
        r["people_per_pharmacy"] = round(n / ph) if n and ph else None
        if not points and r.get("people_per_pharmacist"):
            r["people_per_pharmacy"] = r["people_per_pharmacist"]  # Europe: pharmacists, by country
    ranks = {k: percentile_ranks([r[k] for r in regions], "high") for k in WEIGHTS}
    for i, r in enumerate(regions):
        parts = {k: ranks[k][i] for k in WEIGHTS if ranks[k][i] is not None}
        r["access_score"] = round(sum(parts[k] * WEIGHTS[k] for k in parts) / sum(WEIGHTS[k] for k in parts), 1) if parts else None
    order = sorted((r for r in regions if r["access_score"] is not None), key=lambda r: -r["access_score"])
    for n, r in enumerate(order, 1):
        r["access_rank"] = n


def basemap(cfg, args):
    """Outline, neighbours and city names around the country (Natural Earth)."""
    countries = json.loads(download(f"{NE}/ne_10m_admin_0_countries_ind.geojson", name="ne_10m_countries_ind.geojson", offline=args.offline).read_text())
    places = json.loads(download(f"{NE}/ne_50m_populated_places_simple.geojson", name="ne_50m_places.geojson", offline=args.offline).read_text())
    area = box(*cfg["bbox"]).buffer(2)
    own, near = None, []
    for f in countries["features"]:
        g = shape(f["geometry"]).buffer(0)
        if not g.intersects(area):
            continue
        g = g.intersection(area).simplify(0.002 if cfg["bbox"][2] - cfg["bbox"][0] < 20 else 0.02, preserve_topology=True)
        if f["properties"].get("ADM0_A3") == cfg["iso3"]:
            own = g
        else:
            near.append({"name": f["properties"].get("NAME_EN") or f["properties"].get("NAME"), "geometry": mapping(g)})
    labels = [[round(f["geometry"]["coordinates"][0], 3), round(f["geometry"]["coordinates"][1], 3), f["properties"]["name"], "city", int(f["properties"].get("scalerank") or 9)]
              for f in places["features"] if area.contains(Point(f["geometry"]["coordinates"][:2]))]
    return {"country": mapping(own) if own else None, "neighbours": near, "labels": labels}


def write(code, cfg, regions, points, point_label, base):
    out = OUT / "world" / code
    out.mkdir(parents=True, exist_ok=True)
    feats = []
    for r in regions:
        props = {k: v for k, v in r.items() if k not in ("geom", "key")}
        lp = r["geom"].representative_point()
        props["label"] = [round(lp.x, 4), round(lp.y, 4)]
        feats.append(geo.feature(r["geom"], props, {"sg": 0.0005, "nz": 0.005}.get(code, 0.01)))
    (out / "regions.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))
    (out / "points.json").write_text(json.dumps({"label": point_label, "rows": points}, separators=(",", ":")))
    (out / "basemap.json").write_text(json.dumps(base, separators=(",", ":")))
    xs = [c for r in regions for c in r["geom"].bounds[::2]]
    ys = [c for r in regions for c in r["geom"].bounds[1::2]]
    meta = {
        "name": cfg["name"], "code": code, "unit": cfg["unit"], "built": time.strftime("%Y-%m-%d"),
        "bbox": [round(min(xs), 3), round(min(ys), 3), round(max(xs), 3), round(max(ys), 3)],
        "people": sum(r.get("people", 0) for r in regions), "pharmacies": len(points),
        "per_pharmacist": not points,  # Europe: the figure is people per pharmacist, by country
        "weights": WEIGHTS, "sources": {k: v for k, v in status.items() if k.startswith(code)},
    }
    (out / "meta.json").write_text(json.dumps(meta, indent=1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args()
    built = []
    for code, fn in (("sg", build_sg), ("nz", build_nz), ("au", build_au), ("eu", build_eu)):
        cfg = COUNTRIES[code]
        try:
            regions, points, label = fn(args)
            add_measures(regions, points)
            write(code, cfg, regions, points, label, basemap(cfg, args))
            built.append({"code": code, "name": cfg["name"]})
        except Exception as exc:
            note(f"{code}_build", False, f"{type(exc).__name__}: {exc}"[:200])
    (OUT / "world").mkdir(parents=True, exist_ok=True)
    (OUT / "world" / "countries.json").write_text(json.dumps({"countries": built, "sources": status}, indent=1))
    print("Countries built:", ", ".join(c["name"] for c in built) or "none")


if __name__ == "__main__":
    main()
